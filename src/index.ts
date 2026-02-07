/**
 * Cloudflare Worker Entry Point
 *
 * Main router that dispatches requests to appropriate handlers.
 */

import { Env } from './types';

// Page handlers
import { handleTrackingRedirect } from './handlers/pages/tracking';
import { handleAdmin } from './handlers/pages/admin';
import { handleSitemap } from './handlers/pages/sitemap';

// API handlers
import { handleListPosts, handleGetPost, handleTrack } from './handlers/api/public';
import { handleLogin, handleLogout } from './handlers/api/auth';
import {
  handleListDrafts,
  handleCreateDraft,
  handleGetDraft,
  handleUpdateDraft,
  handleDeleteDraft,
  handlePublishDraft,
  handleShareDraft,
  handleRevokeShareDraft,
  handleGetDraftByShareToken,
} from './handlers/api/drafts';
import { handleUpload } from './handlers/api/upload';
import { handleOgFetch } from './handlers/api/og';
import {
  handleAdminListPosts,
  handleAdminGetPost,
  handleAdminUpdatePost,
  handleAdminDeletePost,
  handleUnpublishPost,
} from './handlers/api/posts';
import {
  handleListTracking,
  handleCreateTracking,
  handleGetTracking,
  handleDeleteTracking,
} from './handlers/api/tracking';
import {
  handleListPhotosPublic,
  handleAdminListPhotos,
  handleAdminGetPhoto,
  handleCreatePhoto,
  handleUpdatePhoto,
  handleDeletePhoto,
} from './handlers/api/photos';
import {
  handleListProjectsPublic,
  handleAdminListProjects,
  handleAdminGetProject,
  handleCreateProject,
  handleUpdateProject,
  handleDeleteProject,
  handleReorderProjects,
} from './handlers/api/projects';
import {
  handleGetAboutPage,
  handleAdminGetAboutPage,
  handleAdminUpdateAboutPage,
} from './handlers/api/pages';

// Utilities
import { isAuthenticated } from './middleware/auth';
import { jsonResponse, corsHeaders, getCorsHeaders, handleCorsPreflightResponse, requireJsonContentType, addSecurityHeaders } from './lib/response';

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    let path = url.pathname;

    // Strip trailing slash (redirect to canonical URL without it)
    // Exclude /admin paths — Cloudflare ASSETS needs trailing slashes for directory indexes.
    if (path.length > 1 && path.endsWith('/') && !path.startsWith('/admin')) {
      url.pathname = path.slice(0, -1);
      return addSecurityHeaders(Response.redirect(url.toString(), 301));
    }

    let response: Response;

    // API routes
    if (path.startsWith('/api/')) {
      response = await handleApi(request, env, path);
      return addSecurityHeaders(response);
    }

    // Tracking redirect
    if (path.startsWith('/s/')) {
      response = await handleTrackingRedirect(request, env, path);
      return addSecurityHeaders(response);
    }

    // Admin routes
    if (path === '/admin' || path.startsWith('/admin/')) {
      response = await handleAdmin(request, env, path);
      return addSecurityHeaders(response);
    }

    // Sitemap
    if (path === '/sitemap.xml') {
      response = await handleSitemap(env);
      return addSecurityHeaders(response);
    }

    // Known SPA routes — serve index.html as the SPA shell with 200 status.
    // The client-side router handles rendering for all public routes.
    // Static routes we know are valid:
    const knownStaticRoutes = ['/', '/projects', '/blog', '/about', '/photography'];
    // Dynamic route patterns we accept (can't verify content without KV lookup):
    const knownDynamicPrefixes = ['/blog/', '/draft/share/'];

    const isKnownRoute =
      knownStaticRoutes.includes(path) ||
      knownDynamicPrefixes.some(prefix => path.startsWith(prefix) && path.length > prefix.length);

    if (isKnownRoute) {
      const indexRequest = new Request(new URL('/', request.url), request);
      response = await env.ASSETS.fetch(indexRequest);
      return addSecurityHeaders(response);
    }

    // Try to serve from static assets (CSS, JS, images, etc.)
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) {
      return addSecurityHeaders(assetResponse);
    }

    // Unknown route — serve SPA shell with 404 status for crawlers.
    // The client-side router will still render and show the 404 page.
    const indexRequest = new Request(new URL('/', request.url), request);
    const spaShell = await env.ASSETS.fetch(indexRequest);
    return addSecurityHeaders(new Response(spaShell.body, {
      status: 404,
      headers: spaShell.headers,
    }));
  },
} satisfies ExportedHandler<Env>;

/**
 * Route API requests to appropriate handlers
 */
export async function handleApi(request: Request, env: Env, path: string): Promise<Response> {
  const method = request.method;
  const origin = request.headers.get('Origin');

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return handleCorsPreflightResponse(origin);
  }

  // Resolve the API response, then apply origin-scoped CORS headers
  const response = await resolveApiRoute(request, env, path, method);
  return applyCorsHeaders(response, origin);
}

/**
 * Apply origin-scoped CORS headers to a response.
 * Replaces any wildcard Access-Control-Allow-Origin set by handlers
 * with an origin-checked value (or removes it for disallowed origins).
 */
function applyCorsHeaders(response: Response, origin: string | null): Response {
  const corsH = getCorsHeaders(origin);
  const newResponse = new Response(response.body, response);

  // Remove any wildcard ACAO that handlers may have set via the deprecated constant
  newResponse.headers.delete('Access-Control-Allow-Origin');

  // Set origin-scoped header only if origin is allowed
  if (corsH['Access-Control-Allow-Origin']) {
    newResponse.headers.set('Access-Control-Allow-Origin', corsH['Access-Control-Allow-Origin']);
    newResponse.headers.set('Vary', 'Origin');
  }

  // Ensure methods and headers are present
  newResponse.headers.set('Access-Control-Allow-Methods', corsH['Access-Control-Allow-Methods']);
  newResponse.headers.set('Access-Control-Allow-Headers', corsH['Access-Control-Allow-Headers']);

  return newResponse;
}

/**
 * Internal: match API path to handler and return the response
 */
async function resolveApiRoute(request: Request, env: Env, path: string, method: string): Promise<Response> {
  try {
    // =========================================================================
    // Public API Endpoints
    // =========================================================================

    // GET /api/posts - List all posts
    if (path === '/api/posts' && method === 'GET') {
      return handleListPosts(env);
    }

    // GET /api/posts/:slug - Get single post
    if (path.startsWith('/api/posts/') && !path.startsWith('/api/posts/id/') && method === 'GET') {
      const slug = path.replace('/api/posts/', '');
      return handleGetPost(env, slug);
    }

    // POST /api/track - Record tracking event
    if (path === '/api/track' && method === 'POST') {
      return handleTrack(request, env);
    }

    // GET /api/photos - List all photos (public)
    if (path === '/api/photos' && method === 'GET') {
      return handleListPhotosPublic(env);
    }

    // GET /api/projects - List all projects (public)
    if (path === '/api/projects' && method === 'GET') {
      return handleListProjectsPublic(env);
    }

    // GET /api/about - Get about page content (public)
    if (path === '/api/about' && method === 'GET') {
      return handleGetAboutPage(env);
    }

    // GET /api/draft/share/:token - Get draft by share token (public)
    if (path.match(/^\/api\/draft\/share\/[^/]+$/) && method === 'GET') {
      const token = path.replace('/api/draft/share/', '');
      return handleGetDraftByShareToken(env, token);
    }

    // =========================================================================
    // Auth Endpoints
    // =========================================================================

    // POST /api/auth/login
    if (path === '/api/auth/login' && method === 'POST') {
      return handleLogin(request, env);
    }

    // POST /api/auth/logout
    if (path === '/api/auth/logout' && method === 'POST') {
      return handleLogout(request, env);
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

      // Enforce Content-Type: application/json on POST/PUT routes that expect
      // JSON bodies. Routes that use multipart/form-data (upload, photo create)
      // or have no request body (publish, share, unpublish) are excluded.
      if (method === 'POST' || method === 'PUT') {
        const isMultipart = path === '/api/admin/upload' || path === '/api/admin/photos';
        const isNoBody =
          path.endsWith('/publish') || path.endsWith('/share') || path.endsWith('/unpublish');
        if (!isMultipart && !isNoBody) {
          const ctError = requireJsonContentType(request);
          if (ctError) return ctError;
        }
      }

      // -----------------------------------------------------------------------
      // Drafts
      // -----------------------------------------------------------------------

      // GET /api/admin/drafts - List all drafts
      if (path === '/api/admin/drafts' && method === 'GET') {
        return handleListDrafts(env);
      }

      // POST /api/admin/drafts - Create new draft
      if (path === '/api/admin/drafts' && method === 'POST') {
        return handleCreateDraft(request, env);
      }

      // GET /api/admin/drafts/:id - Get single draft
      if (path.match(/^\/api\/admin\/drafts\/[^/]+$/) && method === 'GET') {
        const id = path.replace('/api/admin/drafts/', '');
        return handleGetDraft(env, id);
      }

      // PUT /api/admin/drafts/:id - Update draft
      if (path.match(/^\/api\/admin\/drafts\/[^/]+$/) && method === 'PUT') {
        const id = path.replace('/api/admin/drafts/', '');
        return handleUpdateDraft(request, env, id);
      }

      // DELETE /api/admin/drafts/:id - Delete draft
      if (path.match(/^\/api\/admin\/drafts\/[^/]+$/) && method === 'DELETE') {
        const id = path.replace('/api/admin/drafts/', '');
        return handleDeleteDraft(env, id);
      }

      // POST /api/admin/drafts/:id/publish - Publish draft
      if (path.match(/^\/api\/admin\/drafts\/[^/]+\/publish$/) && method === 'POST') {
        const id = path.replace('/api/admin/drafts/', '').replace('/publish', '');
        return handlePublishDraft(env, id);
      }

      // POST /api/admin/drafts/:id/share - Create share token
      if (path.match(/^\/api\/admin\/drafts\/[^/]+\/share$/) && method === 'POST') {
        const id = path.replace('/api/admin/drafts/', '').replace('/share', '');
        return handleShareDraft(env, id);
      }

      // DELETE /api/admin/drafts/:id/share - Revoke share token
      if (path.match(/^\/api\/admin\/drafts\/[^/]+\/share$/) && method === 'DELETE') {
        const id = path.replace('/api/admin/drafts/', '').replace('/share', '');
        return handleRevokeShareDraft(env, id);
      }

      // -----------------------------------------------------------------------
      // Posts
      // -----------------------------------------------------------------------

      // GET /api/admin/posts - List all posts (admin view)
      if (path === '/api/admin/posts' && method === 'GET') {
        return handleAdminListPosts(env);
      }

      // GET /api/admin/posts/:id - Get post by ID
      if (path.match(/^\/api\/admin\/posts\/[^/]+$/) && method === 'GET') {
        const id = path.replace('/api/admin/posts/', '');
        return handleAdminGetPost(env, id);
      }

      // PUT /api/admin/posts/:id - Update post
      if (path.match(/^\/api\/admin\/posts\/[^/]+$/) && method === 'PUT') {
        const id = path.replace('/api/admin/posts/', '');
        return handleAdminUpdatePost(request, env, id);
      }

      // DELETE /api/admin/posts/:id - Delete post
      if (path.match(/^\/api\/admin\/posts\/[^/]+$/) && method === 'DELETE') {
        const id = path.replace('/api/admin/posts/', '');
        return handleAdminDeletePost(env, id);
      }

      // POST /api/admin/posts/:id/unpublish - Unpublish post
      if (path.match(/^\/api\/admin\/posts\/[^/]+\/unpublish$/) && method === 'POST') {
        const id = path.replace('/api/admin/posts/', '').replace('/unpublish', '');
        return handleUnpublishPost(env, id);
      }

      // -----------------------------------------------------------------------
      // Tracking
      // -----------------------------------------------------------------------

      // GET /api/admin/tracking - List all tracking slugs
      if (path === '/api/admin/tracking' && method === 'GET') {
        return handleListTracking(env);
      }

      // POST /api/admin/tracking - Create tracking slug
      if (path === '/api/admin/tracking' && method === 'POST') {
        return handleCreateTracking(request, env);
      }

      // GET /api/admin/tracking/:slug - Get tracking slug with events
      if (path.match(/^\/api\/admin\/tracking\/[^/]+$/) && method === 'GET') {
        const slug = path.replace('/api/admin/tracking/', '');
        return handleGetTracking(env, slug);
      }

      // DELETE /api/admin/tracking/:slug - Delete tracking slug
      if (path.match(/^\/api\/admin\/tracking\/[^/]+$/) && method === 'DELETE') {
        const slug = path.replace('/api/admin/tracking/', '');
        return handleDeleteTracking(env, slug);
      }

      // -----------------------------------------------------------------------
      // Upload
      // -----------------------------------------------------------------------

      // POST /api/admin/upload - Upload file to R2
      if (path === '/api/admin/upload' && method === 'POST') {
        return handleUpload(request, env);
      }

      // GET /api/admin/og?url=... - Fetch OpenGraph metadata
      if (path === '/api/admin/og' && method === 'GET') {
        return handleOgFetch(request);
      }

      // -----------------------------------------------------------------------
      // Photos
      // -----------------------------------------------------------------------

      // GET /api/admin/photos - List all photos
      if (path === '/api/admin/photos' && method === 'GET') {
        return handleAdminListPhotos(env);
      }

      // POST /api/admin/photos - Create new photo
      if (path === '/api/admin/photos' && method === 'POST') {
        return handleCreatePhoto(request, env);
      }

      // GET /api/admin/photos/:id - Get single photo
      if (path.match(/^\/api\/admin\/photos\/[^/]+$/) && method === 'GET') {
        const id = path.replace('/api/admin/photos/', '');
        return handleAdminGetPhoto(env, id);
      }

      // PUT /api/admin/photos/:id - Update photo
      if (path.match(/^\/api\/admin\/photos\/[^/]+$/) && method === 'PUT') {
        const id = path.replace('/api/admin/photos/', '');
        return handleUpdatePhoto(request, env, id);
      }

      // DELETE /api/admin/photos/:id - Delete photo
      if (path.match(/^\/api\/admin\/photos\/[^/]+$/) && method === 'DELETE') {
        const id = path.replace('/api/admin/photos/', '');
        return handleDeletePhoto(env, id);
      }

      // -----------------------------------------------------------------------
      // Projects
      // -----------------------------------------------------------------------

      // PUT /api/admin/projects/reorder - Reorder projects (must be before :id routes)
      if (path === '/api/admin/projects/reorder' && method === 'PUT') {
        return handleReorderProjects(request, env);
      }

      // GET /api/admin/projects - List all projects
      if (path === '/api/admin/projects' && method === 'GET') {
        return handleAdminListProjects(env);
      }

      // POST /api/admin/projects - Create new project
      if (path === '/api/admin/projects' && method === 'POST') {
        return handleCreateProject(request, env);
      }

      // GET /api/admin/projects/:id - Get single project
      if (path.match(/^\/api\/admin\/projects\/[^/]+$/) && method === 'GET') {
        const id = path.replace('/api/admin/projects/', '');
        return handleAdminGetProject(env, id);
      }

      // PUT /api/admin/projects/:id - Update project
      if (path.match(/^\/api\/admin\/projects\/[^/]+$/) && method === 'PUT') {
        const id = path.replace('/api/admin/projects/', '');
        return handleUpdateProject(request, env, id);
      }

      // DELETE /api/admin/projects/:id - Delete project
      if (path.match(/^\/api\/admin\/projects\/[^/]+$/) && method === 'DELETE') {
        const id = path.replace('/api/admin/projects/', '');
        return handleDeleteProject(env, id);
      }

      // -----------------------------------------------------------------------
      // About Page
      // -----------------------------------------------------------------------

      // GET /api/admin/about - Get about page content
      if (path === '/api/admin/about' && method === 'GET') {
        return handleAdminGetAboutPage(env);
      }

      // PUT /api/admin/about - Update about page content
      if (path === '/api/admin/about' && method === 'PUT') {
        return handleAdminUpdateAboutPage(request, env);
      }
    }

    // Not found
    return jsonResponse({ error: 'Not found' }, corsHeaders, 404);

  } catch (error) {
    console.error('API error:', error);
    return jsonResponse({ error: 'Internal server error' }, corsHeaders, 500);
  }
}
