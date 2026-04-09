/**
 * Auth Middleware Tests
 *
 * Tests for authentication helper functions.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import {
  verifyPassword,
  hashPassword,
  getSessionToken,
  isAuthenticated,
  login,
  logout,
  createSessionCookie,
  clearSessionCookie,
} from '../../middleware/auth';
import { createSession } from '../../dao/session.dao';
import { KV_KEY } from '../../types';

// Extend env type for testing
type TestEnv = typeof env & {
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD_HASH: string;
  SESSION_SECRET: string;
};

describe('Auth Middleware', () => {
  let testEnv: TestEnv;

  beforeEach(async () => {
    // Clean up sessions
    const keys = await env.KV.list({ prefix: KV_KEY.SESSION });
    for (const key of keys.keys) {
      await env.KV.delete(key.name);
    }
  });

  describe('hashPassword', () => {
    it('should generate hash in correct format', async () => {
      const hash = await hashPassword('testpassword');
      expect(hash).toMatch(/^\$simple\$[a-f0-9]+\$[a-f0-9]+$/);
    });

    it('should generate different hashes for same password (different salt)', async () => {
      const hash1 = await hashPassword('password');
      const hash2 = await hashPassword('password');
      expect(hash1).not.toBe(hash2);
    });

    it('should generate 16-char salt', async () => {
      const hash = await hashPassword('password');
      const parts = hash.split('$');
      expect(parts[2].length).toBe(16);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const hash = await hashPassword('mypassword');
      const result = await verifyPassword('mypassword', hash);
      expect(result).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const hash = await hashPassword('mypassword');
      const result = await verifyPassword('wrongpassword', hash);
      expect(result).toBe(false);
    });

    it('should reject malformed hash', async () => {
      const result = await verifyPassword('password', '$simple$invalid');
      expect(result).toBe(false);
    });

    it('should handle direct comparison fallback', async () => {
      // For development: plain text comparison
      const result = await verifyPassword('plaintext', 'plaintext');
      expect(result).toBe(true);
    });

    it('should reject wrong password in direct comparison', async () => {
      const result = await verifyPassword('password', 'different');
      expect(result).toBe(false);
    });
  });

  describe('getSessionToken', () => {
    it('should return null for request without cookies', () => {
      const request = new Request('http://localhost/');
      const token = getSessionToken(request);
      expect(token).toBeNull();
    });

    it('should extract session token from cookie', () => {
      const request = new Request('http://localhost/', {
        headers: { Cookie: 'gp_session=abc123' },
      });
      const token = getSessionToken(request);
      expect(token).toBe('abc123');
    });

    it('should handle multiple cookies', () => {
      const request = new Request('http://localhost/', {
        headers: { Cookie: 'other=value; gp_session=mytoken; another=test' },
      });
      const token = getSessionToken(request);
      expect(token).toBe('mytoken');
    });

    it('should return null if session cookie not present', () => {
      const request = new Request('http://localhost/', {
        headers: { Cookie: 'other=value; different=cookie' },
      });
      const token = getSessionToken(request);
      expect(token).toBeNull();
    });

    it('should handle cookie with spaces', () => {
      const request = new Request('http://localhost/', {
        headers: { Cookie: ' gp_session=token123 ; other=value ' },
      });
      const token = getSessionToken(request);
      expect(token).toBe('token123');
    });
  });

  describe('isAuthenticated', () => {
    it('should return false for request without session', async () => {
      const request = new Request('http://localhost/');
      const result = await isAuthenticated(request, env);
      expect(result).toBe(false);
    });

    it('should return false for invalid session token', async () => {
      const request = new Request('http://localhost/', {
        headers: { Cookie: 'gp_session=invalid-token' },
      });
      const result = await isAuthenticated(request, env);
      expect(result).toBe(false);
    });

    it('should return true for valid session', async () => {
      const session = await createSession(env.KV, 3600);
      const request = new Request('http://localhost/', {
        headers: { Cookie: `gp_session=${session.token}` },
      });
      const result = await isAuthenticated(request, env);
      expect(result).toBe(true);
    });

    it('should return false for expired session', async () => {
      // Create expired session directly in KV
      const token = crypto.randomUUID();
      const expiredSession = {
        token,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      };
      await env.KV.put(`${KV_KEY.SESSION}${token}`, JSON.stringify(expiredSession));

      const request = new Request('http://localhost/', {
        headers: { Cookie: `gp_session=${token}` },
      });
      const result = await isAuthenticated(request, env);
      expect(result).toBe(false);
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      const passwordHash = await hashPassword('correctpassword');
      testEnv = {
        ...env,
        ADMIN_USERNAME: 'admin',
        ADMIN_PASSWORD_HASH: passwordHash,
        SESSION_SECRET: 'test-secret',
      } as TestEnv;
    });

    it('should fail for wrong username', async () => {
      const result = await login('wronguser', 'correctpassword', testEnv);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('should fail for wrong password', async () => {
      const result = await login('admin', 'wrongpassword', testEnv);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('should succeed with correct credentials', async () => {
      const result = await login('admin', 'correctpassword', testEnv);
      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
    });

    it('should create session in KV on success', async () => {
      const result = await login('admin', 'correctpassword', testEnv);
      expect(result.token).toBeDefined();

      const sessionData = await env.KV.get(`${KV_KEY.SESSION}${result.token}`);
      expect(sessionData).not.toBeNull();
    });
  });

  describe('logout', () => {
    it('should delete session from KV', async () => {
      const session = await createSession(env.KV, 3600);
      const request = new Request('http://localhost/', {
        headers: { Cookie: `gp_session=${session.token}` },
      });

      await logout(request, env);

      const sessionData = await env.KV.get(`${KV_KEY.SESSION}${session.token}`);
      expect(sessionData).toBeNull();
    });

    it('should not throw for request without session', async () => {
      const request = new Request('http://localhost/');
      await expect(logout(request, env)).resolves.toBeUndefined();
    });

    it('should not throw for invalid session', async () => {
      const request = new Request('http://localhost/', {
        headers: { Cookie: 'gp_session=invalid' },
      });
      await expect(logout(request, env)).resolves.toBeUndefined();
    });
  });

  describe('createSessionCookie', () => {
    it('should create cookie with token', () => {
      const cookie = createSessionCookie('mytoken123');
      expect(cookie).toContain('gp_session=mytoken123');
    });

    it('should set HttpOnly flag', () => {
      const cookie = createSessionCookie('token');
      expect(cookie).toContain('HttpOnly');
    });

    it('should set Secure flag', () => {
      const cookie = createSessionCookie('token');
      expect(cookie).toContain('Secure');
    });

    it('should set SameSite=Strict', () => {
      const cookie = createSessionCookie('token');
      expect(cookie).toContain('SameSite=Strict');
    });

    it('should set Path=/', () => {
      const cookie = createSessionCookie('token');
      expect(cookie).toContain('Path=/');
    });

    it('should set default Max-Age', () => {
      const cookie = createSessionCookie('token');
      expect(cookie).toContain('Max-Age=');
    });

    it('should use custom Max-Age', () => {
      const cookie = createSessionCookie('token', 7200);
      expect(cookie).toContain('Max-Age=7200');
    });
  });

  describe('clearSessionCookie', () => {
    it('should set empty value', () => {
      const cookie = clearSessionCookie();
      expect(cookie).toContain('gp_session=');
    });

    it('should set Max-Age=0', () => {
      const cookie = clearSessionCookie();
      expect(cookie).toContain('Max-Age=0');
    });

    it('should maintain security flags', () => {
      const cookie = clearSessionCookie();
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('SameSite=Strict');
    });
  });
});
