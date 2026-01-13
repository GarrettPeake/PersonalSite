import { Env } from './types';
import {
  listPosts, getPostBySlug, getPost, recordTrackingEvent, getTrackingSlug,
  getDraftByShareToken, listDrafts, getDraft, createDraft, updateDraft,
  deleteDraft, publishDraft, createShareToken, listTrackingSlugs,
  createTrackingSlug, deleteTrackingSlug, deletePost, unpublishPost,
  updatePost,
} from './lib/kv';
import { renderMarkdown } from './lib/markdown';
import {
  isAuthenticated, login, logout, createSessionCookie, clearSessionCookie,
} from './middleware/auth';

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
    if (path.startsWith('/blog/') && path !== '/blog/') {
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

// =============================================================================
// API Handlers
// =============================================================================

async function handleApi(request: Request, env: Env, path: string): Promise<Response> {
  const method = request.method;

  // CORS headers for API
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle preflight
  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // =========================================================================
    // Public API Endpoints
    // =========================================================================

    // GET /api/posts - List all posts
    if (path === '/api/posts' && method === 'GET') {
      const posts = await listPosts(env.KV);
      const summaries = posts.map(({ id, title, slug, publishedAt, updatedAt, content }) => ({
        id,
        title,
        slug,
        publishedAt,
        updatedAt,
        excerpt: getExcerpt(content),
      }));
      return jsonResponse(summaries, corsHeaders);
    }

    // GET /api/posts/:slug - Get single post
    if (path.startsWith('/api/posts/') && !path.startsWith('/api/posts/id/') && method === 'GET') {
      const slug = path.replace('/api/posts/', '');
      const post = await getPostBySlug(env.KV, slug);
      if (!post) {
        return jsonResponse({ error: 'Post not found' }, corsHeaders, 404);
      }
      return jsonResponse(post, corsHeaders);
    }

    // POST /api/track - Record tracking event
    if (path === '/api/track' && method === 'POST') {
      const body = await request.json() as { slug: string; page: string; referrer?: string };
      if (!body.slug || !body.page) {
        return jsonResponse({ error: 'Missing slug or page' }, corsHeaders, 400);
      }
      const tracking = await getTrackingSlug(env.KV, body.slug);
      if (tracking) {
        await recordTrackingEvent(env.KV, body.slug, {
          page: body.page,
          referrer: body.referrer,
          userAgent: request.headers.get('user-agent') || undefined,
        });
      }
      return jsonResponse({ ok: true }, corsHeaders);
    }

    // =========================================================================
    // Auth Endpoints
    // =========================================================================

    // POST /api/auth/login
    if (path === '/api/auth/login' && method === 'POST') {
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

    // POST /api/auth/logout
    if (path === '/api/auth/logout' && method === 'POST') {
      await logout(request, env);
      return new Response(JSON.stringify({ success: true }), {
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': clearSessionCookie(),
          ...corsHeaders,
        },
      });
    }

    // =========================================================================
    // Admin API Endpoints (require auth)
    // =========================================================================

    if (path.startsWith('/api/admin/')) {
      // Check authentication
      const authenticated = await isAuthenticated(request, env);
      if (!authenticated) {
        return jsonResponse({ error: 'Unauthorized' }, corsHeaders, 401);
      }

      // GET /api/admin/drafts - List all drafts
      if (path === '/api/admin/drafts' && method === 'GET') {
        const drafts = await listDrafts(env.KV);
        return jsonResponse(drafts, corsHeaders);
      }

      // POST /api/admin/drafts - Create new draft
      if (path === '/api/admin/drafts' && method === 'POST') {
        const body = await request.json() as { title: string; slug: string; content: string };
        const draft = await createDraft(env.KV, body);
        return jsonResponse(draft, corsHeaders);
      }

      // GET /api/admin/drafts/:id - Get single draft
      if (path.match(/^\/api\/admin\/drafts\/[^/]+$/) && method === 'GET') {
        const id = path.replace('/api/admin/drafts/', '');
        const draft = await getDraft(env.KV, id);
        if (!draft) return jsonResponse({ error: 'Not found' }, corsHeaders, 404);
        return jsonResponse(draft, corsHeaders);
      }

      // PUT /api/admin/drafts/:id - Update draft
      if (path.match(/^\/api\/admin\/drafts\/[^/]+$/) && method === 'PUT') {
        const id = path.replace('/api/admin/drafts/', '');
        const body = await request.json() as Partial<{ title: string; slug: string; content: string }>;
        const draft = await updateDraft(env.KV, id, body);
        if (!draft) return jsonResponse({ error: 'Not found' }, corsHeaders, 404);
        return jsonResponse(draft, corsHeaders);
      }

      // DELETE /api/admin/drafts/:id - Delete draft
      if (path.match(/^\/api\/admin\/drafts\/[^/]+$/) && method === 'DELETE') {
        const id = path.replace('/api/admin/drafts/', '');
        const success = await deleteDraft(env.KV, id);
        if (!success) return jsonResponse({ error: 'Not found' }, corsHeaders, 404);
        return jsonResponse({ ok: true }, corsHeaders);
      }

      // POST /api/admin/drafts/:id/publish - Publish draft
      if (path.match(/^\/api\/admin\/drafts\/[^/]+\/publish$/) && method === 'POST') {
        const id = path.replace('/api/admin/drafts/', '').replace('/publish', '');
        try {
          const post = await publishDraft(env.KV, id);
          return jsonResponse(post, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: (e as Error).message }, corsHeaders, 400);
        }
      }

      // POST /api/admin/drafts/:id/share - Create share token
      if (path.match(/^\/api\/admin\/drafts\/[^/]+\/share$/) && method === 'POST') {
        const id = path.replace('/api/admin/drafts/', '').replace('/share', '');
        try {
          const token = await createShareToken(env.KV, id);
          return jsonResponse({ token, url: `/draft/share/${token}` }, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: (e as Error).message }, corsHeaders, 400);
        }
      }

      // GET /api/admin/posts - List all posts (admin view)
      if (path === '/api/admin/posts' && method === 'GET') {
        const posts = await listPosts(env.KV);
        return jsonResponse(posts, corsHeaders);
      }

      // GET /api/admin/posts/:id - Get post by ID
      if (path.match(/^\/api\/admin\/posts\/[^/]+$/) && method === 'GET') {
        const id = path.replace('/api/admin/posts/', '');
        const post = await getPost(env.KV, id);
        if (!post) return jsonResponse({ error: 'Not found' }, corsHeaders, 404);
        return jsonResponse(post, corsHeaders);
      }

      // PUT /api/admin/posts/:id - Update post
      if (path.match(/^\/api\/admin\/posts\/[^/]+$/) && method === 'PUT') {
        const id = path.replace('/api/admin/posts/', '');
        const body = await request.json() as Partial<{ title: string; slug: string; content: string }>;
        try {
          const post = await updatePost(env.KV, id, body);
          if (!post) return jsonResponse({ error: 'Not found' }, corsHeaders, 404);
          return jsonResponse(post, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: (e as Error).message }, corsHeaders, 400);
        }
      }

      // DELETE /api/admin/posts/:id - Delete post
      if (path.match(/^\/api\/admin\/posts\/[^/]+$/) && method === 'DELETE') {
        const id = path.replace('/api/admin/posts/', '');
        const success = await deletePost(env.KV, id);
        if (!success) return jsonResponse({ error: 'Not found' }, corsHeaders, 404);
        return jsonResponse({ ok: true }, corsHeaders);
      }

      // POST /api/admin/posts/:id/unpublish - Unpublish post
      if (path.match(/^\/api\/admin\/posts\/[^/]+\/unpublish$/) && method === 'POST') {
        const id = path.replace('/api/admin/posts/', '').replace('/unpublish', '');
        try {
          const draft = await unpublishPost(env.KV, id);
          return jsonResponse(draft, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: (e as Error).message }, corsHeaders, 400);
        }
      }

      // GET /api/admin/tracking - List all tracking slugs
      if (path === '/api/admin/tracking' && method === 'GET') {
        const slugs = await listTrackingSlugs(env.KV);
        return jsonResponse(slugs, corsHeaders);
      }

      // POST /api/admin/tracking - Create tracking slug
      if (path === '/api/admin/tracking' && method === 'POST') {
        const body = await request.json() as { tag: string; slug?: string };
        try {
          const tracking = await createTrackingSlug(env.KV, body.tag, body.slug);
          return jsonResponse(tracking, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: (e as Error).message }, corsHeaders, 400);
        }
      }

      // GET /api/admin/tracking/:slug - Get tracking slug with events
      if (path.match(/^\/api\/admin\/tracking\/[^/]+$/) && method === 'GET') {
        const slug = path.replace('/api/admin/tracking/', '');
        const tracking = await getTrackingSlug(env.KV, slug);
        if (!tracking) return jsonResponse({ error: 'Not found' }, corsHeaders, 404);
        return jsonResponse(tracking, corsHeaders);
      }

      // DELETE /api/admin/tracking/:slug - Delete tracking slug
      if (path.match(/^\/api\/admin\/tracking\/[^/]+$/) && method === 'DELETE') {
        const slug = path.replace('/api/admin/tracking/', '');
        const success = await deleteTrackingSlug(env.KV, slug);
        if (!success) return jsonResponse({ error: 'Not found' }, corsHeaders, 404);
        return jsonResponse({ ok: true }, corsHeaders);
      }
    }

    // Not found
    return jsonResponse({ error: 'Not found' }, corsHeaders, 404);

  } catch (error) {
    console.error('API error:', error);
    return jsonResponse({ error: 'Internal server error' }, corsHeaders, 500);
  }
}

// =============================================================================
// Page Handlers
// =============================================================================

/**
 * Handle tracking redirect /s/:slug
 */
async function handleTrackingRedirect(request: Request, env: Env, path: string): Promise<Response> {
  const slug = path.replace('/s/', '');

  if (!slug) {
    return Response.redirect(new URL('/', request.url).toString(), 302);
  }

  // Verify slug exists (optional - could skip for privacy)
  const tracking = await getTrackingSlug(env.KV, slug);
  if (!tracking) {
    // Redirect anyway to not reveal tracking info
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
    localStorage.setItem('trackingSlug', '${escapeJs(slug)}');
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: '${escapeJs(slug)}',
        page: '/',
        referrer: document.referrer
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
async function handleBlogPost(request: Request, env: Env, path: string): Promise<Response> {
  const slug = path.replace('/blog/', '');

  if (!slug) {
    return env.ASSETS.fetch(request);
  }

  const post = await getPostBySlug(env.KV, slug);

  if (!post) {
    return new Response(renderPostPage({
      title: 'Post Not Found',
      content: '<p>The post you\'re looking for doesn\'t exist.</p>',
      publishedAt: '',
      notFound: true,
    }), {
      status: 404,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  const renderedContent = renderMarkdown(post.content);

  return new Response(renderPostPage({
    title: post.title,
    content: renderedContent,
    publishedAt: post.publishedAt,
  }), {
    headers: { 'Content-Type': 'text/html' },
  });
}

/**
 * Handle draft preview pages /draft/share/:token
 */
async function handleDraftPreview(_request: Request, env: Env, path: string): Promise<Response> {
  // Extract token from /draft/share/:token
  const match = path.match(/^\/draft\/share\/([^/]+)/);
  if (!match) {
    return new Response('Not found', { status: 404 });
  }

  const token = match[1];
  const draft = await getDraftByShareToken(env.KV, token);

  if (!draft) {
    return new Response(renderPostPage({
      title: 'Draft Not Found',
      content: '<p>This draft link is invalid or has expired.</p>',
      publishedAt: '',
      notFound: true,
      isDraft: true,
    }), {
      status: 404,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  const renderedContent = renderMarkdown(draft.content);

  return new Response(renderPostPage({
    title: draft.title,
    content: renderedContent,
    publishedAt: draft.updatedAt,
    isDraft: true,
  }), {
    headers: { 'Content-Type': 'text/html' },
  });
}

/**
 * Handle admin routes /admin/*
 */
async function handleAdmin(request: Request, env: Env, path: string): Promise<Response> {
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

// =============================================================================
// HTML Templates
// =============================================================================

interface PostPageOptions {
  title: string;
  content: string;
  publishedAt: string;
  notFound?: boolean;
  isDraft?: boolean;
}

function renderPostPage(options: PostPageOptions): string {
  const { title, content, publishedAt, notFound, isDraft } = options;

  const dateHtml = publishedAt && !notFound
    ? `<p class="post-meta">${formatDate(publishedAt)}</p>`
    : '';

  const draftBanner = isDraft && !notFound
    ? `<div class="draft-banner">Draft Preview</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${notFound ? '<meta name="robots" content="noindex">' : ''}
  ${isDraft ? '<meta name="robots" content="noindex">' : ''}
  <title>${escapeHtml(title)} | Garrett Peake</title>
  <link rel="stylesheet" href="/styles/theme.css">
  <link rel="stylesheet" href="/styles/base.css">
  <script type="module" src="/components/core/gp-theme-toggle.js"></script>
  <script type="module" src="/components/core/gp-header.js"></script>
  <script type="module" src="/components/core/gp-footer.js"></script>
  <script type="module" src="/components/tracking/gp-tracker.js"></script>
  <style>
    body {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    .post-meta {
      color: color-mix(in srgb, var(--color-text) 60%, transparent);
      margin-bottom: var(--space-lg);
    }
    .post-content {
      line-height: 1.8;
    }
    .post-content h2, .post-content h3 {
      margin-top: var(--space-xl);
    }
    .post-content pre {
      overflow-x: auto;
    }
    .post-content img {
      max-width: 100%;
      height: auto;
    }
    .post-content blockquote {
      border-left: 4px solid var(--color-primary);
      padding-left: var(--space-md);
      margin: var(--space-md) 0;
      font-style: italic;
    }
    .draft-banner {
      background: var(--color-accent);
      color: var(--color-bg);
      text-align: center;
      padding: var(--space-sm);
      font-weight: bold;
    }
    .back-link {
      display: inline-block;
      margin-bottom: var(--space-lg);
    }
  </style>
</head>
<body>
  <gp-tracker></gp-tracker>
  ${draftBanner}
  <gp-header></gp-header>

  <main class="container">
    <a href="/blog" class="back-link">&larr; Back to blog</a>
    <article>
      <h1>${escapeHtml(title)}</h1>
      ${dateHtml}
      <div class="post-content">
        ${content}
      </div>
    </article>
  </main>

  <gp-footer></gp-footer>
</body>
</html>`;
}

// =============================================================================
// Utilities
// =============================================================================

function jsonResponse(data: unknown, headers: Record<string, string>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

function escapeHtml(text: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => escapeMap[char]);
}

function escapeJs(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getExcerpt(content: string, maxLength = 200): string {
  // Strip markdown formatting for excerpt
  const text = content
    .replace(/^#+\s+.+$/gm, '') // Remove headings
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
    .replace(/[*_`]/g, '') // Remove formatting chars
    .replace(/\n+/g, ' ') // Collapse newlines
    .trim();

  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}
