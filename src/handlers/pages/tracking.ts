/**
 * Tracking Redirect Handler
 *
 * Handles /s/:slug routes for tracking link redirects.
 */

import { Env } from '../../types';
import { getTrackingSlug } from '../../dao/tracking.dao';
import { renderTrackingRedirectPage } from '../../templates/tracking-redirect';
import { htmlResponse } from '../../lib/response';

/**
 * Handle tracking redirect requests
 */
export async function handleTrackingRedirect(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {
  const slug = path.replace('/s/', '');

  if (!slug) {
    return Response.redirect(new URL('/', request.url).toString(), 302);
  }

  // Verify slug exists (optional - could skip for privacy)
  const tracking = await getTrackingSlug(env.DB, slug);
  if (!tracking) {
    // Redirect anyway to not reveal tracking info
    return Response.redirect(new URL('/', request.url).toString(), 302);
  }

  // Return a minimal HTML page that stores the slug and redirects
  return htmlResponse(renderTrackingRedirectPage(slug));
}
