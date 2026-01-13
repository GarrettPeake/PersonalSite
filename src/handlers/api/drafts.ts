/**
 * Admin Drafts API Handlers
 *
 * Handles /api/admin/drafts/* endpoints.
 */

import { Env } from '../../types';
import {
  listDrafts,
  getDraft,
  createDraft,
  updateDraft,
  deleteDraft,
  createShareToken,
} from '../../dao/draft.dao';
import { publishDraft } from '../../dao/post.dao';
import { jsonResponse, corsHeaders } from '../../lib/response';

/**
 * GET /api/admin/drafts - List all drafts
 */
export async function handleListDrafts(env: Env): Promise<Response> {
  const drafts = await listDrafts(env.KV);
  return jsonResponse(drafts, corsHeaders);
}

/**
 * POST /api/admin/drafts - Create a new draft
 */
export async function handleCreateDraft(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as { title: string; slug: string; content: string };
  const draft = await createDraft(env.KV, body);
  return jsonResponse(draft, corsHeaders);
}

/**
 * GET /api/admin/drafts/:id - Get a single draft
 */
export async function handleGetDraft(env: Env, id: string): Promise<Response> {
  const draft = await getDraft(env.KV, id);
  if (!draft) {
    return jsonResponse({ error: 'Not found' }, corsHeaders, 404);
  }
  return jsonResponse(draft, corsHeaders);
}

/**
 * PUT /api/admin/drafts/:id - Update a draft
 */
export async function handleUpdateDraft(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const body = await request.json() as Partial<{ title: string; slug: string; content: string }>;
  const draft = await updateDraft(env.KV, id, body);
  if (!draft) {
    return jsonResponse({ error: 'Not found' }, corsHeaders, 404);
  }
  return jsonResponse(draft, corsHeaders);
}

/**
 * DELETE /api/admin/drafts/:id - Delete a draft
 */
export async function handleDeleteDraft(env: Env, id: string): Promise<Response> {
  const success = await deleteDraft(env.KV, id);
  if (!success) {
    return jsonResponse({ error: 'Not found' }, corsHeaders, 404);
  }
  return jsonResponse({ ok: true }, corsHeaders);
}

/**
 * POST /api/admin/drafts/:id/publish - Publish a draft
 */
export async function handlePublishDraft(env: Env, id: string): Promise<Response> {
  try {
    const post = await publishDraft(env.KV, id);
    return jsonResponse(post, corsHeaders);
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, corsHeaders, 400);
  }
}

/**
 * POST /api/admin/drafts/:id/share - Create a share token
 */
export async function handleShareDraft(env: Env, id: string): Promise<Response> {
  try {
    const token = await createShareToken(env.KV, id);
    return jsonResponse({ token, url: `/draft/share/${token}` }, corsHeaders);
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, corsHeaders, 400);
  }
}
