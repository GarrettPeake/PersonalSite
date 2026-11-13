/**
 * Auth API Handlers
 *
 * Signing in is GAuth's (see src/handlers/pages/admin.ts); the rest of
 * /api/auth/* is Better Auth's (src/middleware/auth.ts).
 */

import { Env } from '../../types';
import { signOut } from '../../middleware/auth';
import { corsHeaders } from '../../lib/response';

/**
 * POST /api/auth/logout - End the session
 *
 * The admin's scripts then go to the home page: opening an admin page signs in
 * again through GAuth.
 */
export async function handleLogout(request: Request, env: Env): Promise<Response> {
  const headers = await signOut(request, env);
  headers.set('Content-Type', 'application/json');
  for (const [name, value] of Object.entries(corsHeaders)) headers.set(name, value);
  return new Response(JSON.stringify({ success: true }), { headers });
}
