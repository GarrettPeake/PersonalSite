/**
 * Auth API Handlers Tests
 *
 * Tests for authentication endpoints (login, logout).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { handleLogin, handleLogout } from '../../../handlers/api/auth';
import { hashPassword } from '../../../middleware/auth';
import { KV_PREFIX } from '../../../types';

// Extend env type for testing
type TestEnv = typeof env & {
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD_HASH: string;
  SESSION_SECRET: string;
};

describe('Auth API Handlers', () => {
  let testEnv: TestEnv;

  beforeEach(async () => {
    // Clean up sessions
    const keys = await env.KV.list({ prefix: KV_PREFIX.SESSION });
    for (const key of keys.keys) {
      await env.KV.delete(key.name);
    }

    // Set up test environment with credentials
    const passwordHash = await hashPassword('testpassword');
    testEnv = {
      ...env,
      ADMIN_USERNAME: 'testadmin',
      ADMIN_PASSWORD_HASH: passwordHash,
      SESSION_SECRET: 'test-secret',
    } as TestEnv;
  });

  describe('handleLogin', () => {
    it('should return 401 for invalid username', async () => {
      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'wronguser',
          password: 'testpassword',
        }),
      });

      const response = await handleLogin(request, testEnv);

      expect(response.status).toBe(401);
      const data = await response.json() as { success: boolean; error: string };
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid credentials');
    });

    it('should return 401 for invalid password', async () => {
      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testadmin',
          password: 'wrongpassword',
        }),
      });

      const response = await handleLogin(request, testEnv);

      expect(response.status).toBe(401);
      const data = await response.json() as { success: boolean; error: string };
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid credentials');
    });

    it('should return success for valid credentials', async () => {
      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testadmin',
          password: 'testpassword',
        }),
      });

      const response = await handleLogin(request, testEnv);

      expect(response.status).toBe(200);
      const data = await response.json() as { success: boolean };
      expect(data.success).toBe(true);
    });

    it('should set session cookie on successful login', async () => {
      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testadmin',
          password: 'testpassword',
        }),
      });

      const response = await handleLogin(request, testEnv);

      const setCookie = response.headers.get('Set-Cookie');
      expect(setCookie).toBeDefined();
      expect(setCookie).toContain('gp_session=');
      expect(setCookie).toContain('HttpOnly');
      expect(setCookie).toContain('Secure');
      expect(setCookie).toContain('SameSite=Strict');
    });

    it('should create session in KV on successful login', async () => {
      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testadmin',
          password: 'testpassword',
        }),
      });

      await handleLogin(request, testEnv);

      const sessions = await env.KV.list({ prefix: KV_PREFIX.SESSION });
      expect(sessions.keys.length).toBeGreaterThan(0);
    });

    it('should include CORS headers', async () => {
      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'wrong',
          password: 'wrong',
        }),
      });

      const response = await handleLogin(request, testEnv);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });

  describe('handleLogout', () => {
    it('should return success', async () => {
      const request = new Request('http://localhost/api/auth/logout', {
        method: 'POST',
      });

      const response = await handleLogout(request, testEnv);

      expect(response.status).toBe(200);
      const data = await response.json() as { success: boolean };
      expect(data.success).toBe(true);
    });

    it('should clear session cookie', async () => {
      const request = new Request('http://localhost/api/auth/logout', {
        method: 'POST',
      });

      const response = await handleLogout(request, testEnv);

      const setCookie = response.headers.get('Set-Cookie');
      expect(setCookie).toBeDefined();
      expect(setCookie).toContain('gp_session=');
      expect(setCookie).toContain('Max-Age=0');
    });

    it('should delete session from KV when logged in', async () => {
      // First login
      const loginRequest = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testadmin',
          password: 'testpassword',
        }),
      });
      const loginResponse = await handleLogin(loginRequest, testEnv);
      const setCookie = loginResponse.headers.get('Set-Cookie')!;
      const tokenMatch = setCookie.match(/gp_session=([^;]+)/);
      const token = tokenMatch![1];

      // Verify session exists
      const sessionsBefore = await env.KV.list({ prefix: KV_PREFIX.SESSION });
      expect(sessionsBefore.keys.length).toBe(1);

      // Then logout
      const logoutRequest = new Request('http://localhost/api/auth/logout', {
        method: 'POST',
        headers: { Cookie: `gp_session=${token}` },
      });
      await handleLogout(logoutRequest, testEnv);

      // Verify session is deleted
      const sessionsAfter = await env.KV.list({ prefix: KV_PREFIX.SESSION });
      expect(sessionsAfter.keys.length).toBe(0);
    });

    it('should include CORS headers', async () => {
      const request = new Request('http://localhost/api/auth/logout', {
        method: 'POST',
      });

      const response = await handleLogout(request, testEnv);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('should work even without session cookie', async () => {
      const request = new Request('http://localhost/api/auth/logout', {
        method: 'POST',
      });

      const response = await handleLogout(request, testEnv);

      expect(response.status).toBe(200);
    });
  });
});
