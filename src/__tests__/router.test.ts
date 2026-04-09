/**
 * Router Tests
 *
 * Tests that the main router correctly dispatches requests to handlers.
 * Uses mocked handlers to verify routing logic independently.
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { env, createExecutionContext } from 'cloudflare:test';
import worker from '../index';

// Mock the page handlers
vi.mock('../handlers/pages/tracking', () => ({
  handleTrackingRedirect: vi.fn(() => new Response('tracking redirect handler')),
}));

vi.mock('../handlers/pages/admin', () => ({
  handleAdmin: vi.fn(() => new Response('admin handler')),
}));

vi.mock('../handlers/pages/sitemap', () => ({
  handleSitemap: vi.fn(() => new Response('sitemap handler', {
    headers: { 'Content-Type': 'application/xml' },
  })),
}));

// Mock auth - use partial mock to keep real login/logout but mock isAuthenticated
vi.mock('../middleware/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../middleware/auth')>();
  return {
    ...actual,
    isAuthenticated: vi.fn(() => Promise.resolve(false)),
  };
});

// Import the mocked handlers for assertion
import { handleTrackingRedirect } from '../handlers/pages/tracking';
import { handleAdmin } from '../handlers/pages/admin';
import { handleSitemap } from '../handlers/pages/sitemap';

describe('Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Static routes', () => {
    it('should serve assets for root path', async () => {
      const request = new Request('http://localhost/');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);

      // The router delegates to env.ASSETS.fetch for static routes
      expect(handleAdmin).not.toHaveBeenCalled();
    });

    it('should route /sitemap.xml to sitemap handler', async () => {
      const request = new Request('http://localhost/sitemap.xml');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);

      expect(handleSitemap).toHaveBeenCalledWith(env);
      expect(await response.text()).toBe('sitemap handler');
      expect(response.headers.get('Content-Type')).toBe('application/xml');
    });
  });

  describe('SPA shell routes', () => {
    it('should serve SPA shell for /blog', async () => {
      const request = new Request('http://localhost/blog');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);

      // Should serve index.html (SPA shell) — not call any SSR handler
      expect(handleAdmin).not.toHaveBeenCalled();
      expect(handleTrackingRedirect).not.toHaveBeenCalled();
    });

    it('should serve SPA shell for /blog/:slug', async () => {
      const request = new Request('http://localhost/blog/my-post');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);

      // Blog posts are now client-rendered — SPA shell is served
      expect(handleAdmin).not.toHaveBeenCalled();
    });

    it('should serve SPA shell for /about', async () => {
      const request = new Request('http://localhost/about');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);

      expect(handleAdmin).not.toHaveBeenCalled();
    });

    it('should serve SPA shell for /photography', async () => {
      const request = new Request('http://localhost/photography');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);

      expect(handleAdmin).not.toHaveBeenCalled();
    });

    it('should serve SPA shell for /projects', async () => {
      const request = new Request('http://localhost/projects');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);

      expect(handleAdmin).not.toHaveBeenCalled();
    });

    it('should serve SPA shell for /draft/share/:token', async () => {
      const request = new Request('http://localhost/draft/share/abc123');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);

      // Draft previews are now client-rendered
      expect(handleAdmin).not.toHaveBeenCalled();
    });

    it('should serve SPA shell with 200 for known routes', async () => {
      const knownRoutes = ['/projects', '/blog', '/about', '/photography', '/blog/some-post', '/draft/share/token123'];
      for (const route of knownRoutes) {
        const request = new Request(`http://localhost${route}`);
        const ctx = createExecutionContext();
        const response = await worker.fetch(request, env, ctx);
        expect(response.status).toBe(200);
      }
    });

    it('should serve SPA shell with 404 status for unknown routes', async () => {
      const request = new Request('http://localhost/404test');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);

      // Should return 404 status for crawlers, but still serve the SPA shell
      expect(response.status).toBe(404);
    });

    it('should serve SPA shell with 404 status for deep unknown routes', async () => {
      const request = new Request('http://localhost/some/random/path');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(404);
    });
  });

  describe('Tracking redirect routes', () => {
    it('should route /s/:slug to tracking handler', async () => {
      const request = new Request('http://localhost/s/abc123');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);

      expect(handleTrackingRedirect).toHaveBeenCalledWith(
        request,
        env,
        '/s/abc123'
      );
      expect(await response.text()).toBe('tracking redirect handler');
    });
  });

  describe('Admin routes', () => {
    it('should route /admin/ to admin handler (no trailing slash redirect for admin)', async () => {
      const request = new Request('http://localhost/admin/');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);

      expect(handleAdmin).toHaveBeenCalledWith(
        request,
        env,
        '/admin/'
      );
    });

    it('should route /admin to admin handler', async () => {
      const request = new Request('http://localhost/admin');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);

      expect(handleAdmin).toHaveBeenCalledWith(
        request,
        env,
        '/admin'
      );
      expect(await response.text()).toBe('admin handler');
    });

    it('should route /admin/posts to admin handler', async () => {
      const request = new Request('http://localhost/admin/posts');
      const ctx = createExecutionContext();
      await worker.fetch(request, env, ctx);

      expect(handleAdmin).toHaveBeenCalledWith(
        request,
        env,
        '/admin/posts'
      );
    });

    it('should route /admin/login to admin handler', async () => {
      const request = new Request('http://localhost/admin/login');
      const ctx = createExecutionContext();
      await worker.fetch(request, env, ctx);

      expect(handleAdmin).toHaveBeenCalledWith(
        request,
        env,
        '/admin/login'
      );
    });
  });

  describe('API routes', () => {
    it('should handle CORS preflight requests with allowed origin', async () => {
      const request = new Request('http://localhost/api/posts', {
        method: 'OPTIONS',
        headers: { 'Origin': 'https://gpeake.com' },
      });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://gpeake.com');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(response.headers.get('Vary')).toBe('Origin');
    });

    it('should not set Access-Control-Allow-Origin for disallowed origin', async () => {
      const request = new Request('http://localhost/api/posts', {
        method: 'OPTIONS',
        headers: { 'Origin': 'https://evil.com' },
      });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    });

    it('should return 404 for unknown API routes', async () => {
      const request = new Request('http://localhost/api/unknown');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body).toEqual({ error: 'Not found' });
    });

    it('should return 401 for unauthenticated admin API requests', async () => {
      const request = new Request('http://localhost/api/admin/drafts');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toEqual({ error: 'Unauthorized' });
    });
  });
});

describe('API Route Matching', () => {
  beforeAll(async () => {
    // Create D1 tables needed by non-mocked API handlers
    await env.DB.exec(
      "CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, title TEXT NOT NULL DEFAULT '', slug TEXT NOT NULL UNIQUE, content TEXT NOT NULL DEFAULT '', description TEXT, published_at TEXT NOT NULL, updated_at TEXT NOT NULL)"
    );
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Public API endpoints', () => {
    it('should match GET /api/posts', async () => {
      const request = new Request('http://localhost/api/posts');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(200);
    });

    it('should match GET /api/posts/:slug', async () => {
      const request = new Request('http://localhost/api/posts/my-slug');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);

      // Will return 404 since no post exists
      expect(response.status).toBe(404);
    });

    it('should not match /api/posts/id/ path', async () => {
      const request = new Request('http://localhost/api/posts/id/123');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);

      // This should fall through to 404 since /api/posts/id/ is excluded
      expect(response.status).toBe(404);
    });
  });

  describe('Auth endpoints', () => {
    it('should match POST /api/auth/login', async () => {
      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'test', password: 'test' }),
      });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);

      // Will return 401 since credentials are invalid
      expect(response.status).toBe(401);
    });

    it('should match POST /api/auth/logout', async () => {
      const request = new Request('http://localhost/api/auth/logout', {
        method: 'POST',
      });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ success: true });
    });
  });

  describe('Admin API route patterns', () => {
    it('should require auth for /api/admin/drafts', async () => {
      const request = new Request('http://localhost/api/admin/drafts');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(401);
    });

    it('should require auth for /api/admin/posts', async () => {
      const request = new Request('http://localhost/api/admin/posts');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(401);
    });

    it('should require auth for /api/admin/tracking', async () => {
      const request = new Request('http://localhost/api/admin/tracking');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(401);
    });

    it('should require auth for nested admin routes', async () => {
      const request = new Request('http://localhost/api/admin/drafts/123/publish', {
        method: 'POST',
      });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(401);
    });
  });
});
