/**
 * Admin Posts API Handlers
 *
 * Handles /api/admin/posts/* endpoints.
 */

import { Env } from '../../types';
import {
  listPosts,
  getPost,
  updatePost,
  deletePost,
  unpublishPost,
} from '../../dao/post.dao';
import { jsonResponse, corsHeaders, parseJsonBody } from '../../lib/response';

/**
 * GET /api/admin/posts - List all posts (admin view)
 */
export async function handleAdminListPosts(env: Env): Promise<Response> {
  const posts = await listPosts(env.KV);
  return jsonResponse(posts, corsHeaders);
}

/**
 * GET /api/admin/posts/:id - Get a post by ID
 */
export async function handleAdminGetPost(env: Env, id: string): Promise<Response> {
  const post = await getPost(env.KV, id);
  if (!post) {
    return jsonResponse({ error: 'Not found' }, corsHeaders, 404);
  }
  return jsonResponse(post, corsHeaders);
}

/**
 * PUT /api/admin/posts/:id - Update a post
 */
export async function handleAdminUpdatePost(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const body = await parseJsonBody<Partial<{ title: string; slug: string; content: string }>>(request);
  if (!body) {
    return jsonResponse({ error: 'Invalid JSON body' }, corsHeaders, 400);
  }
  try {
    const post = await updatePost(env.KV, id, body);
    if (!post) {
      return jsonResponse({ error: 'Not found' }, corsHeaders, 404);
    }
    return jsonResponse(post, corsHeaders);
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, corsHeaders, 400);
  }
}

/**
 * DELETE /api/admin/posts/:id - Delete a post
 */
export async function handleAdminDeletePost(env: Env, id: string): Promise<Response> {
  const success = await deletePost(env.KV, id);
  if (!success) {
    return jsonResponse({ error: 'Not found' }, corsHeaders, 404);
  }
  return jsonResponse({ ok: true }, corsHeaders);
}

/**
 * POST /api/admin/posts/:id/unpublish - Unpublish a post back to draft
 */
export async function handleUnpublishPost(env: Env, id: string): Promise<Response> {
  try {
    const draft = await unpublishPost(env.KV, id);
    return jsonResponse(draft, corsHeaders);
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, corsHeaders, 400);
  }
}
