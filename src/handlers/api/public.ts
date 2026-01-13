/**
 * Public API Handlers
 *
 * Handles public API endpoints that don't require authentication.
 */

import { Env } from '../../types';
import { listPosts, getPostBySlug } from '../../dao/post.dao';
import { getTrackingSlug, recordTrackingEvent } from '../../dao/tracking.dao';
import { jsonResponse, corsHeaders } from '../../lib/response';
import { getExcerpt } from '../../lib/utils';

/**
 * GET /api/posts - List all published posts
 */
export async function handleListPosts(env: Env): Promise<Response> {
  const posts = await listPosts(env.KV);
  const summaries = posts.map(({ id, title, slug, publishedAt, updatedAt, content }) => ({
    id,
    title,
    slug,
    publishedAt,
    updatedAt,
    excerpt: getExcerpt(content),
  }));
  return jsonResponse(summaries, corsHeaders);
}

/**
 * GET /api/posts/:slug - Get a single post by slug
 */
export async function handleGetPost(env: Env, slug: string): Promise<Response> {
  const post = await getPostBySlug(env.KV, slug);
  if (!post) {
    return jsonResponse({ error: 'Post not found' }, corsHeaders, 404);
  }
  return jsonResponse(post, corsHeaders);
}

/**
 * POST /api/track - Record a tracking event
 */
export async function handleTrack(
  request: Request,
  env: Env
): Promise<Response> {
  const body = await request.json() as { slug: string; page: string; referrer?: string };

  if (!body.slug || !body.page) {
    return jsonResponse({ error: 'Missing slug or page' }, corsHeaders, 400);
  }

  const tracking = await getTrackingSlug(env.KV, body.slug);
  if (tracking) {
    await recordTrackingEvent(env.KV, body.slug, {
      page: body.page,
      referrer: body.referrer,
      userAgent: request.headers.get('user-agent') || undefined,
    });
  }

  return jsonResponse({ ok: true }, corsHeaders);
}
