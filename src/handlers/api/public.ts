/**
 * Public API Handlers
 *
 * Handles public API endpoints that don't require authentication.
 */

import { Env } from '../../types';
import { listPosts, getPostBySlug } from '../../dao/post.dao';
import { getTrackingSlug, recordTrackingEvent } from '../../dao/tracking.dao';
import { jsonResponse, corsHeaders, parseJsonBody } from '../../lib/response';

/** Cache-Control for public GET endpoints */
const PUBLIC_CACHE = 'public, max-age=60, s-maxage=300';

/**
 * GET /api/posts - List all published posts
 */
export async function handleListPosts(env: Env): Promise<Response> {
  const posts = await listPosts(env.DB);
  return jsonResponse(posts, { ...corsHeaders, 'Cache-Control': PUBLIC_CACHE });
}

/**
 * GET /api/posts/:slug - Get a single post by slug
 */
export async function handleGetPost(env: Env, slug: string): Promise<Response> {
  const post = await getPostBySlug(env.DB, slug);
  if (!post) {
    return jsonResponse({ error: 'Post not found' }, corsHeaders, 404);
  }
  // Strip internal ID from public response
  const { id: _id, ...publicPost } = post;
  return jsonResponse(publicPost, { ...corsHeaders, 'Cache-Control': PUBLIC_CACHE });
}

/** Maximum field lengths for tracking event data */
const MAX_PAGE_LENGTH = 2048;
const MAX_REFERRER_LENGTH = 2048;
const MAX_USER_AGENT_LENGTH = 512;

/** Rate limit: max track events per IP per minute */
const TRACK_RATE_LIMIT = 100;
const TRACK_RATE_WINDOW = 60; // seconds

/**
 * POST /api/track - Record a tracking event
 */
export async function handleTrack(
  request: Request,
  env: Env
): Promise<Response> {
  // Rate limiting by IP
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
  const rateKey = `trackrate:${ip}`;
  const currentCount = parseInt(await env.KV.get(rateKey) || '0', 10);
  if (currentCount >= TRACK_RATE_LIMIT) {
    return jsonResponse({ error: 'Rate limit exceeded' }, corsHeaders, 429);
  }
  await env.KV.put(rateKey, String(currentCount + 1), { expirationTtl: TRACK_RATE_WINDOW });

  const body = await parseJsonBody<{ slug: string; page: string; referrer?: string }>(request);
  if (!body) {
    return jsonResponse({ error: 'Invalid JSON body' }, corsHeaders, 400);
  }

  if (!body.slug || !body.page) {
    return jsonResponse({ error: 'Missing slug or page' }, corsHeaders, 400);
  }

  // Truncate fields to prevent oversized payloads
  const page = String(body.page).slice(0, MAX_PAGE_LENGTH);
  const referrer = body.referrer ? String(body.referrer).slice(0, MAX_REFERRER_LENGTH) : undefined;
  const rawUA = request.headers.get('user-agent') || undefined;
  const userAgent = rawUA ? rawUA.slice(0, MAX_USER_AGENT_LENGTH) : undefined;

  const tracking = await getTrackingSlug(env.DB, body.slug);
  if (tracking) {
    await recordTrackingEvent(env.DB, body.slug, {
      page,
      referrer,
      userAgent,
    });
  }

  return jsonResponse({ ok: true }, corsHeaders);
}
