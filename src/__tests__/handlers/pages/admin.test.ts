/**
 * Admin Page Handler Tests
 *
 * Tests for admin page auth guard.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { env } from 'cloudflare:test';
import { handleAdmin } from '../../../handlers/pages/admin';
import { createSession } from '../../../dao/session.dao';
import { KV_PREFIX } from '../../../types';

// Mock ASSETS.fetch
const mockAssetsFetch = vi.fn(() => Promise.resolve(new Response('admin page')));

describe('Admin Page Handler', () => {
  let testEnv: typeof env & { ASSETS: { fetch: typeof mockAssetsFetch } };

  beforeEach(async () => {
    // Clean up sessions
    const keys = await env.KV.list({ prefix: KV_PREFIX.SESSION });
    for (const key of keys.keys) {
      await env.KV.delete(key.name);
    }

    testEnv = {
      ...env,
      ASSETS: { fetch: mockAssetsFetch },
    } as typeof env & { ASSETS: { fetch: typeof mockAssetsFetch } };

    mockAssetsFetch.mockClear();
  });

  describe('Login page access', () => {
    it('should allow access to /admin/login without auth', async () => {
      const request = new Request('http://localhost/admin/login');
      await handleAdmin(request, testEnv, '/admin/login');

      expect(mockAssetsFetch).toHaveBeenCalled();
    });

    it('should allow access to /admin/login.html without auth', async () => {
      const request = new Request('http://localhost/admin/login.html');
      await handleAdmin(request, testEnv, '/admin/login.html');

      expect(mockAssetsFetch).toHaveBeenCalled();
    });
  });

  describe('Protected pages - unauthenticated', () => {
    it('should redirect /admin/ to login', async () => {
      const request = new Request('http://localhost/admin/');
      const response = await handleAdmin(request, testEnv, '/admin/');

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('http://localhost/admin/login');
    });

    it('should redirect /admin/posts to login', async () => {
      const request = new Request('http://localhost/admin/posts');
      const response = await handleAdmin(request, testEnv, '/admin/posts');

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('http://localhost/admin/login');
    });

    it('should redirect /admin/drafts to login', async () => {
      const request = new Request('http://localhost/admin/drafts');
      const response = await handleAdmin(request, testEnv, '/admin/drafts');

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('http://localhost/admin/login');
    });

    it('should redirect /admin/editor to login', async () => {
      const request = new Request('http://localhost/admin/editor');
      const response = await handleAdmin(request, testEnv, '/admin/editor');

      expect(response.status).toBe(302);
    });

    it('should redirect /admin/tracking to login', async () => {
      const request = new Request('http://localhost/admin/tracking');
      const response = await handleAdmin(request, testEnv, '/admin/tracking');

      expect(response.status).toBe(302);
    });
  });

  describe('Protected pages - authenticated', () => {
    it('should allow access to /admin/ with valid session', async () => {
      const session = await createSession(testEnv.KV, 3600);
      const request = new Request('http://localhost/admin/', {
        headers: { Cookie: `gp_session=${session.token}` },
      });

      await handleAdmin(request, testEnv, '/admin/');

      expect(mockAssetsFetch).toHaveBeenCalled();
    });

    it('should allow access to /admin/posts with valid session', async () => {
      const session = await createSession(testEnv.KV, 3600);
      const request = new Request('http://localhost/admin/posts', {
        headers: { Cookie: `gp_session=${session.token}` },
      });

      await handleAdmin(request, testEnv, '/admin/posts');

      expect(mockAssetsFetch).toHaveBeenCalled();
    });

    it('should allow access to /admin/drafts with valid session', async () => {
      const session = await createSession(testEnv.KV, 3600);
      const request = new Request('http://localhost/admin/drafts', {
        headers: { Cookie: `gp_session=${session.token}` },
      });

      await handleAdmin(request, testEnv, '/admin/drafts');

      expect(mockAssetsFetch).toHaveBeenCalled();
    });

    it('should allow access to /admin/editor with valid session', async () => {
      const session = await createSession(testEnv.KV, 3600);
      const request = new Request('http://localhost/admin/editor', {
        headers: { Cookie: `gp_session=${session.token}` },
      });

      await handleAdmin(request, testEnv, '/admin/editor');

      expect(mockAssetsFetch).toHaveBeenCalled();
    });

    it('should allow access to /admin/tracking with valid session', async () => {
      const session = await createSession(testEnv.KV, 3600);
      const request = new Request('http://localhost/admin/tracking', {
        headers: { Cookie: `gp_session=${session.token}` },
      });

      await handleAdmin(request, testEnv, '/admin/tracking');

      expect(mockAssetsFetch).toHaveBeenCalled();
    });
  });

  describe('Session validation', () => {
    it('should redirect with invalid session token', async () => {
      const request = new Request('http://localhost/admin/', {
        headers: { Cookie: 'gp_session=invalid-token' },
      });

      const response = await handleAdmin(request, testEnv, '/admin/');

      expect(response.status).toBe(302);
    });

    it('should redirect with expired session', async () => {
      // Create expired session
      const token = crypto.randomUUID();
      const expiredSession = {
        token,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      };
      await testEnv.KV.put(`${KV_PREFIX.SESSION}${token}`, JSON.stringify(expiredSession));

      const request = new Request('http://localhost/admin/', {
        headers: { Cookie: `gp_session=${token}` },
      });

      const response = await handleAdmin(request, testEnv, '/admin/');

      expect(response.status).toBe(302);
    });

    it('should handle multiple cookies', async () => {
      const session = await createSession(testEnv.KV, 3600);
      const request = new Request('http://localhost/admin/', {
        headers: { Cookie: `other=value; gp_session=${session.token}; another=test` },
      });

      await handleAdmin(request, testEnv, '/admin/');

      expect(mockAssetsFetch).toHaveBeenCalled();
    });

    it('should handle missing cookie header', async () => {
      const request = new Request('http://localhost/admin/');

      const response = await handleAdmin(request, testEnv, '/admin/');

      expect(response.status).toBe(302);
    });
  });
});
