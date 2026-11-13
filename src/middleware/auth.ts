/**
 * Admin authentication: GAuth sign-in (src/auth/gauth.ts) with Better Auth sessions.
 *
 * Better Auth and the SAML libraries are imported on demand, never at the top of
 * the Worker, so public pages never load them and a problem in sign-in can't
 * take the site down.
 */

import { Env } from '../types';

type Auth = import('../auth/gauth').Auth;

/** Each Set-Cookie on a response (the runtime has getSetCookie; these types predate it). */
const setCookies = (headers: Headers): string[] => (headers as Headers & { getSetCookie(): string[] }).getSetCookie();

/** GAuth sign-in, or null when it can't be set up (a missing secret, say). */
export async function loadAuth(env: Env): Promise<Auth | null> {
  try {
    const { getAuth } = await import('../auth/gauth');
    return getAuth(env);
  } catch (error) {
    console.error('GAuth sign-in unavailable', String(error));
    return null;
  }
}

/** Whether the request carries a Better Auth session cookie (`__Secure-` prefixed in production). */
export function hasSessionCookie(request: Request): boolean {
  return (request.headers.get('Cookie') ?? '').includes('better-auth.session_token=');
}

/** Whether the request is from the signed-in owner (a GAuth session with the owner role). */
export async function isAuthenticated(request: Request, env: Env): Promise<boolean> {
  // Without a session cookie there's nothing to check, so don't pay to load Better Auth.
  if (!hasSessionCookie(request)) return false;
  const auth = await loadAuth(env);
  if (!auth) return false;
  try {
    const { isOwner } = await import('../auth/gauth');
    return await isOwner(auth, request.headers);
  } catch (error) {
    console.error('Session check failed', String(error));
    return false;
  }
}

/** Better Auth's own endpoints (/api/auth/*): GAuth's answers, sign-out, the session. */
export async function handleAuthRequest(request: Request, env: Env): Promise<Response> {
  const auth = await loadAuth(env);
  if (!auth) return Response.json({ error: 'Sign-in unavailable' }, { status: 503 });
  return auth.handler(request);
}

/**
 * Send the browser to GAuth to sign in, coming back to `callbackPath`.
 *
 * Starts the sign-in on the server (it's Better Auth's POST /sign-in/sso), so
 * opening an admin page goes to GAuth in one redirect with no page in between.
 * Returns null if sign-in can't start.
 */
export async function startSignIn(request: Request, env: Env, callbackPath: string): Promise<Response | null> {
  const auth = await loadAuth(env);
  if (!auth) return null;
  const headers = new Headers({ 'Content-Type': 'application/json', Origin: env.APP_ORIGIN });
  for (const name of ['Cookie', 'CF-Connecting-IP', 'User-Agent']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const response = await auth.handler(
    new Request(`${env.APP_ORIGIN}/api/auth/sign-in/sso`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        providerId: 'gauth',
        callbackURL: callbackPath,
        // Better Auth adds ?error=<code>; /admin/login shows it instead of redirecting again.
        errorCallbackURL: '/admin/login',
      }),
    }),
  );
  const data = response.ok ? ((await response.json().catch(() => null)) as { url?: unknown } | null) : null;
  if (typeof data?.url !== 'string') {
    console.error('Starting GAuth sign-in failed', response.status);
    return null;
  }
  const redirect = new Headers({ Location: data.url, 'Cache-Control': 'no-store' });
  // The relay state cookie ties GAuth's answer to this browser.
  for (const cookie of setCookies(response.headers)) redirect.append('Set-Cookie', cookie);
  return new Response(null, { status: 302, headers: redirect });
}

/** End the session (Better Auth's sign-out), returning its cookie-clearing headers. */
export async function signOut(request: Request, env: Env): Promise<Headers> {
  const out = new Headers();
  if (!hasSessionCookie(request)) return out;
  const auth = await loadAuth(env);
  if (!auth) return out;
  const headers = new Headers({ Origin: env.APP_ORIGIN });
  const cookie = request.headers.get('Cookie');
  if (cookie) headers.set('Cookie', cookie);
  const response = await auth.handler(new Request(`${env.APP_ORIGIN}/api/auth/sign-out`, { method: 'POST', headers }));
  for (const value of setCookies(response.headers)) out.append('Set-Cookie', value);
  return out;
}
