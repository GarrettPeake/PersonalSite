import { Env } from './types';

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // API routes
    if (path.startsWith('/api/')) {
      return handleApi(request, env, path);
    }

    // Tracking redirect
    if (path.startsWith('/s/')) {
      return handleTrackingRedirect(request, env, path);
    }

    // Blog post (dynamic)
    if (path.startsWith('/blog/')) {
      return handleBlogPost(request, env, path);
    }

    // Draft preview
    if (path.startsWith('/draft/')) {
      return handleDraftPreview(request, env, path);
    }

    // Admin routes
    if (path.startsWith('/admin/')) {
      return handleAdmin(request, env, path);
    }

    // For any other route that made it to the Worker, serve from assets
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

/**
 * Handle API requests
 */
async function handleApi(_request: Request, _env: Env, path: string): Promise<Response> {
  // TODO: Implement API routing
  return new Response(JSON.stringify({ error: 'Not implemented', path }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Handle tracking redirect /s/:slug
 */
async function handleTrackingRedirect(request: Request, _env: Env, path: string): Promise<Response> {
  const slug = path.replace('/s/', '');

  if (!slug) {
    return Response.redirect(new URL('/', request.url).toString(), 302);
  }

  // Return a minimal HTML page that stores the slug and redirects
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="robots" content="noindex">
  <title>Redirecting...</title>
</head>
<body>
  <script>
    localStorage.setItem('trackingSlug', '${slug}');
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: '${slug}',
        page: '/',
        referrer: document.referrer,
        timestamp: new Date().toISOString()
      })
    }).finally(() => {
      window.location.href = '/';
    });
  </script>
  <noscript>
    <meta http-equiv="refresh" content="0;url=/">
  </noscript>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}

/**
 * Handle blog post pages /blog/:slug
 */
async function handleBlogPost(_request: Request, _env: Env, _path: string): Promise<Response> {
  // TODO: Fetch post from KV and render with markdown
  return new Response('Blog post - not implemented', { status: 501 });
}

/**
 * Handle draft preview pages /draft/share/:uuid
 */
async function handleDraftPreview(_request: Request, _env: Env, _path: string): Promise<Response> {
  // TODO: Fetch draft from KV and render with markdown
  return new Response('Draft preview - not implemented', { status: 501 });
}

/**
 * Handle admin routes /admin/*
 */
async function handleAdmin(request: Request, env: Env, _path: string): Promise<Response> {
  // TODO: Check auth and serve admin pages
  // For now, pass through to static assets
  return env.ASSETS.fetch(request);
}
