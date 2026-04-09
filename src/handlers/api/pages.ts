/**
 * Pages API Handler
 *
 * Handles CMS-editable page content (e.g., About page).
 */

import { Env } from '../../types';
import { getPageContent, updatePageContent } from '../../dao/page.dao';
import { jsonResponse, corsHeaders, parseJsonBody } from '../../lib/response';

/** Cache-Control for public GET endpoints */
const PUBLIC_CACHE = 'public, max-age=60, s-maxage=300';

/**
 * GET /api/about - Get about page content (public)
 */
export async function handleGetAboutPage(env: Env): Promise<Response> {
  try {
    const page = await getPageContent(env.DB, 'about');
    if (!page) {
      return jsonResponse({ content: '', updatedAt: null }, { ...corsHeaders, 'Cache-Control': PUBLIC_CACHE });
    }
    return jsonResponse(page, { ...corsHeaders, 'Cache-Control': PUBLIC_CACHE });
  } catch (error) {
    console.error('Error getting about page:', error);
    return jsonResponse({ error: 'Failed to get about page' }, corsHeaders, 500);
  }
}

/**
 * GET /api/admin/about - Get about page content (admin)
 */
export async function handleAdminGetAboutPage(env: Env): Promise<Response> {
  try {
    const page = await getPageContent(env.DB, 'about');
    if (!page) {
      return jsonResponse({ content: '', updatedAt: null }, corsHeaders);
    }
    return jsonResponse(page, corsHeaders);
  } catch (error) {
    console.error('Error getting about page:', error);
    return jsonResponse({ error: 'Failed to get about page' }, corsHeaders, 500);
  }
}

/**
 * PUT /api/admin/about - Update about page content
 */
export async function handleAdminUpdateAboutPage(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = await parseJsonBody<{ content?: string }>(request);
    if (!body) {
      return jsonResponse({ error: 'Invalid JSON body' }, corsHeaders, 400);
    }

    if (typeof body.content !== 'string') {
      return jsonResponse({ error: 'content is required' }, corsHeaders, 400);
    }

    const page = await updatePageContent(env.DB, 'about', body.content);
    return jsonResponse(page, corsHeaders);
  } catch (error) {
    console.error('Error updating about page:', error);
    return jsonResponse({ error: 'Failed to update about page' }, corsHeaders, 500);
  }
}
