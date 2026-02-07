/**
 * Auth API Handlers
 *
 * Handles authentication-related API endpoints.
 */

import { Env } from '../../types';
import { login, logout, createSessionCookie, clearSessionCookie } from '../../middleware/auth';
import { jsonResponse, corsHeaders } from '../../lib/response';

/**
 * POST /api/auth/login - Authenticate and create session
 *
 * Requires Content-Type: application/json for CSRF protection.
 * Browsers will not send cross-origin application/json requests
 * without a CORS preflight, which effectively blocks CSRF attacks.
 */
export async function handleLogin(request: Request, env: Env): Promise<Response> {
  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.includes('application/json')) {
    return jsonResponse(
      { success: false, error: 'Content-Type must be application/json' },
      corsHeaders,
      400,
    );
  }

  const body = await request.json() as { username: string; password: string };
  const result = await login(body.username, body.password, env);

  if (result.success && result.token) {
    return new Response(JSON.stringify({ success: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': createSessionCookie(result.token),
        ...corsHeaders,
      },
    });
  }

  return jsonResponse({ success: false, error: result.error }, corsHeaders, 401);
}

/**
 * POST /api/auth/logout - Clear session
 */
export async function handleLogout(request: Request, env: Env): Promise<Response> {
  await logout(request, env);

  return new Response(JSON.stringify({ success: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': clearSessionCookie(),
      ...corsHeaders,
    },
  });
}
