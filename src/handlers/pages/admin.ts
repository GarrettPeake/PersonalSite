/**
 * Admin Page Handler
 *
 * Handles /admin/* routes with authentication guard.
 */

import { Env } from '../../types';
import { isAuthenticated } from '../../middleware/auth';

/**
 * Handle admin page requests with auth guard
 */
export async function handleAdmin(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {
  // Login page is always accessible
  if (path === '/admin/login' || path === '/admin/login.html') {
    return env.ASSETS.fetch(request);
  }

  // Check authentication for all other admin pages
  const authenticated = await isAuthenticated(request, env);
  if (!authenticated) {
    // Redirect to login
    return Response.redirect(new URL('/admin/login', request.url).toString(), 302);
  }

  // Serve admin page from assets
  return env.ASSETS.fetch(request);
}
