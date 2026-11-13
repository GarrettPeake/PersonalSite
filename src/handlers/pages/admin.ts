/**
 * Admin Page Handler
 *
 * Every admin page needs the signed-in owner. Anyone else is sent straight to
 * GAuth and brought back to the page they opened: no login page of our own.
 *
 * /admin/login is what the admin's scripts open when the session has run out
 * (?next=<page>), and where a GAuth sign-in that went wrong lands (?error=). It
 * shows a page instead of redirecting when sign-in can't work, so a failure
 * can't bounce between here and GAuth forever.
 */

import { Env } from '../../types';
import { isAuthenticated, startSignIn } from '../../middleware/auth';

/** Redirects to GAuth within this many seconds, before the next one waits for a click. */
const TRIES_COOKIE = 'gp_signin_tries';
const TRIES_WINDOW_SECONDS = 60;
const MAX_TRIES = 3;

/** An admin page to come back to (never another host), or /admin. */
export function adminPath(next: string | null): string {
  if (!next || !/^\/admin(?:[/?#]|$)/.test(next) || /[\\\u0000-\u001F]/.test(next)) return '/admin';
  if (/^\/admin\/login(?:\.html)?(?:[/?#]|$)/.test(next)) return '/admin';
  return next;
}

function triesSoFar(request: Request): number {
  const match = /(?:^|;\s*)gp_signin_tries=(\d+)/.exec(request.headers.get('Cookie') ?? '');
  return match ? Number(match[1]) : 0;
}

function triesCookie(count: number): string {
  return count > 0
    ? `${TRIES_COOKIE}=${count}; Path=/admin; HttpOnly; Secure; SameSite=Lax; Max-Age=${TRIES_WINDOW_SECONDS}`
    : `${TRIES_COOKIE}=; Path=/admin; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

const MESSAGES: Record<string, string> = {
  no_role: "Your GAuth account doesn't have the owner role for this site.",
  tries: "Signing in didn't complete.",
  unavailable: 'Sign-in is unavailable right now.',
};

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

/** The page shown instead of a redirect when signing in didn't work. */
function problemPage(reason: string, next: string, status = 200): Response {
  const message = MESSAGES[reason] ?? `GAuth sign-in didn't complete (${reason.replace(/[^a-z0-9_]/gi, '').slice(0, 40)}).`;
  const retry = `/admin/login?retry=1&next=${encodeURIComponent(next)}`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex">
  <title>Admin | Garrett Peake</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/styles/theme.css">
  <link rel="stylesheet" href="/styles/base.css">
  <link rel="stylesheet" href="/styles/components.css">
  <link rel="stylesheet" href="/styles/pages/login.css">
  <script src="/js/theme-init.js"></script>
</head>
<body class="login-page">
  <main class="login-container">
    <div class="login-box">
      <h1>Admin</h1>
      <p class="error" role="alert">${escapeHtml(message)}</p>
      <a class="btn btn--primary btn--block" href="${escapeHtml(retry)}">Sign in with GAuth</a>
      <a href="/" class="back-link">&larr; Back to site</a>
    </div>
  </main>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Set-Cookie': triesCookie(0) },
  });
}

/**
 * Handle admin page requests with auth guard
 */
export async function handleAdmin(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {
  const url = new URL(request.url);

  // The admin lives on one address (sessions and GAuth's registration are for it).
  if (url.origin !== env.APP_ORIGIN) {
    return Response.redirect(`${env.APP_ORIGIN}${url.pathname}${url.search}`, 302);
  }

  const isLogin = path === '/admin/login' || path === '/admin/login.html';
  const next = isLogin ? adminPath(url.searchParams.get('next')) : adminPath(path + url.search);

  if (await isAuthenticated(request, env)) {
    if (isLogin) return Response.redirect(new URL(next, url).toString(), 302);
    const page = await env.ASSETS.fetch(request);
    if (triesSoFar(request) === 0) return page;
    const response = new Response(page.body, page);
    response.headers.append('Set-Cookie', triesCookie(0));
    return response;
  }

  // GAuth came back with an error (to /admin/login, or to the page itself for a
  // few of Better Auth's errors): say so rather than going round again.
  const error = url.searchParams.get('error');
  if (error) return problemPage(error, next);

  const retry = isLogin && url.searchParams.get('retry') === '1';
  const tries = retry ? 0 : triesSoFar(request);
  if (tries >= MAX_TRIES) return problemPage('tries', next);

  const redirect = await startSignIn(request, env, next);
  if (!redirect) return problemPage('unavailable', next, 503);
  redirect.headers.append('Set-Cookie', triesCookie(tries + 1));
  return redirect;
}
