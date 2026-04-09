/**
 * Admin Tracking API Handlers
 *
 * Handles /api/admin/tracking/* endpoints.
 */

import { Env } from '../../types';
import {
  listTrackingSlugs,
  getTrackingSlug,
  createTrackingSlug,
  deleteTrackingSlug,
} from '../../dao/tracking.dao';
import { jsonResponse, corsHeaders, parseJsonBody } from '../../lib/response';

/**
 * GET /api/admin/tracking - List all tracking slugs
 */
export async function handleListTracking(env: Env): Promise<Response> {
  const slugs = await listTrackingSlugs(env.DB);
  return jsonResponse(slugs, corsHeaders);
}

/**
 * POST /api/admin/tracking - Create a new tracking slug
 */
export async function handleCreateTracking(request: Request, env: Env): Promise<Response> {
  const body = await parseJsonBody<{ tag: string; slug?: string }>(request);
  if (!body) {
    return jsonResponse({ error: 'Invalid JSON body' }, corsHeaders, 400);
  }
  try {
    const tracking = await createTrackingSlug(env.DB, body.tag, body.slug);
    return jsonResponse(tracking, corsHeaders);
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, corsHeaders, 400);
  }
}

/**
 * GET /api/admin/tracking/:slug - Get tracking slug with events
 */
export async function handleGetTracking(env: Env, slug: string): Promise<Response> {
  const tracking = await getTrackingSlug(env.DB, slug);
  if (!tracking) {
    return jsonResponse({ error: 'Not found' }, corsHeaders, 404);
  }
  return jsonResponse(tracking, corsHeaders);
}

/**
 * DELETE /api/admin/tracking/:slug - Delete a tracking slug
 */
export async function handleDeleteTracking(env: Env, slug: string): Promise<Response> {
  const success = await deleteTrackingSlug(env.DB, slug);
  if (!success) {
    return jsonResponse({ error: 'Not found' }, corsHeaders, 404);
  }
  return jsonResponse({ ok: true }, corsHeaders);
}
