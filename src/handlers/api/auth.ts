/**
 * Auth API Handlers
 *
 * Handles authentication-related API endpoints.
 */

import { Env } from '../../types';
import { login, logout, createSessionCookie, clearSessionCookie } from '../../middleware/auth';
import { jsonResponse, corsHeaders, parseJsonBody } from '../../lib/response';

/** Rate limit: max failed attempts within the window */
const RATE_LIMIT_MAX = 5;
/** Rate limit window in seconds (15 minutes) */
const RATE_LIMIT_WINDOW = 15 * 60;

/**
 * Get the client IP from the request.
 * Cloudflare populates CF-Connecting-IP for real client IPs.
 */
function getClientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '0.0.0.0';
}

/**
 * POST /api/auth/login - Authenticate and create session
 *
 * Requires Content-Type: application/json for CSRF protection.
 * Browsers will not send cross-origin application/json requests
 * without a CORS preflight, which effectively blocks CSRF attacks.
 *
 * Rate limited: 5 failed attempts per IP within a 15-minute window.
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

  // Check rate limit
  const ip = getClientIp(request);
  const rateLimitKey = `ratelimit:${ip}`;
  const rateLimitData = await env.KV.get(rateLimitKey);
  const attempts = rateLimitData ? parseInt(rateLimitData, 10) : 0;

  if (attempts >= RATE_LIMIT_MAX) {
    return jsonResponse(
      { success: false, error: 'Too many login attempts. Please try again later.' },
      corsHeaders,
      429,
    );
  }

  const body = await parseJsonBody<{ username: string; password: string }>(request);
  if (!body) {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, corsHeaders, 400);
  }
  const result = await login(body.username, body.password, env);

  if (result.success && result.token) {
    // Reset rate limit on successful login
    await env.KV.delete(rateLimitKey);

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': createSessionCookie(result.token),
        ...corsHeaders,
      },
    });
  }

  // Increment failed attempt counter with TTL
  await env.KV.put(rateLimitKey, String(attempts + 1), { expirationTtl: RATE_LIMIT_WINDOW });

  // Artificial delay on failed login to slow down brute force
  await new Promise(resolve => setTimeout(resolve, 1000));

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
