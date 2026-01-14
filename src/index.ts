/**
 * Cloudflare Worker Entry Point
 *
 * Main router that dispatches requests to appropriate handlers.
 */

import { Env } from './types';

// Page handlers
import { handleBlogPost } from './handlers/pages/blog';
import { handleDraftPreview } from './handlers/pages/draft';
import { handleTrackingRedirect } from './handlers/pages/tracking';
import { handleAdmin } from './handlers/pages/admin';

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

// Utilities
import { isAuthenticated } from './middleware/auth';
import { jsonResponse, corsHeaders, handleCorsPreflightResponse } from './lib/response';

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

/**
 * Route API requests to appropriate handlers
 */
export async function handleApi(request: Request, env: Env, path: string): Promise<Response> {
  const method = request.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return handleCorsPreflightResponse();
  }

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
    }

    // Not found
    return jsonResponse({ error: 'Not found' }, corsHeaders, 404);

  } catch (error) {
    console.error('API error:', error);
    return jsonResponse({ error: 'Internal server error' }, corsHeaders, 500);
  }
}
