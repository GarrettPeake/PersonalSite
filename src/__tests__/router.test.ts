/**
 * Router Tests
 *
 * Tests that the main router correctly dispatches requests to handlers.
 * Uses mocked handlers to verify routing logic independently.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { env, createExecutionContext } from 'cloudflare:test';
import worker from '../index';

// Mock the page handlers
vi.mock('../handlers/pages/blog', () => ({
  handleBlogPost: vi.fn(() => new Response('blog post handler')),
}));

vi.mock('../handlers/pages/draft', () => ({
  handleDraftPreview: vi.fn(() => new Response('draft preview handler')),
}));

vi.mock('../handlers/pages/tracking', () => ({
  handleTrackingRedirect: vi.fn(() => new Response('tracking redirect handler')),
}));

vi.mock('../handlers/pages/admin', () => ({
  handleAdmin: vi.fn(() => new Response('admin handler')),
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
import { handleBlogPost } from '../handlers/pages/blog';
import { handleDraftPreview } from '../handlers/pages/draft';
import { handleTrackingRedirect } from '../handlers/pages/tracking';
import { handleAdmin } from '../handlers/pages/admin';

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
      // Since env.ASSETS is mocked, we just check that page handlers weren't called
      expect(handleBlogPost).not.toHaveBeenCalled();
      expect(handleAdmin).not.toHaveBeenCalled();
    });

    it('should serve assets for /blog without trailing content', async () => {
      const request = new Request('http://localhost/blog');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);

      expect(handleBlogPost).not.toHaveBeenCalled();
    });
  });

  describe('Blog post routes', () => {
    it('should route /blog/:slug to blog handler', async () => {
      const request = new Request('http://localhost/blog/my-post');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);

      expect(handleBlogPost).toHaveBeenCalledWith(
        request,
        env,
        '/blog/my-post'
      );
      expect(await response.text()).toBe('blog post handler');
    });

    it('should route /blog/nested/path to blog handler', async () => {
      const request = new Request('http://localhost/blog/nested/path');
      const ctx = createExecutionContext();
      await worker.fetch(request, env, ctx);

      expect(handleBlogPost).toHaveBeenCalledWith(
        request,
        env,
        '/blog/nested/path'
      );
    });
  });

  describe('Draft preview routes', () => {
    it('should route /draft/share/:token to draft handler', async () => {
      const request = new Request('http://localhost/draft/share/abc123');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);

      expect(handleDraftPreview).toHaveBeenCalledWith(
        request,
        env,
        '/draft/share/abc123'
      );
      expect(await response.text()).toBe('draft preview handler');
    });

    it('should route /draft/other to draft handler', async () => {
      const request = new Request('http://localhost/draft/other');
      const ctx = createExecutionContext();
      await worker.fetch(request, env, ctx);

      expect(handleDraftPreview).toHaveBeenCalledWith(
        request,
        env,
        '/draft/other'
      );
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
    it('should route /admin/ to admin handler', async () => {
      const request = new Request('http://localhost/admin/');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);

      expect(handleAdmin).toHaveBeenCalledWith(
        request,
        env,
        '/admin/'
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
    it('should handle CORS preflight requests', async () => {
      const request = new Request('http://localhost/api/posts', {
        method: 'OPTIONS',
      });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Public API endpoints', () => {
    it('should match GET /api/posts', async () => {
      const request = new Request('http://localhost/api/posts');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);

      // Since we're not mocking the public handlers, this will try to call the real handler
      // The handler will try to call listPosts which will fail gracefully
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
