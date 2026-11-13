/**
 * Auth API Tests
 *
 * Logout, and Better Auth's endpoints as the router exposes them.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import worker from '../../../index';
import { isAuthenticated } from '../../../middleware/auth';
import { APP, migrate, sessionCookie, testEnv } from '../../support/auth';

async function call(url: string, init: RequestInit = {}) {
  const ctx = createExecutionContext();
  const response = await worker.fetch(new Request(url, init), testEnv(), ctx);
  await waitOnExecutionContext(ctx);
  return response;
}

describe('Auth API', () => {
  beforeAll(migrate);

  describe('POST /api/auth/logout', () => {
    it('ends the session', async () => {
      const cookie = await sessionCookie(['owner']);
      const admin = () => new Request(`${APP}/api/admin/drafts`, { headers: { Cookie: cookie } });
      expect(await isAuthenticated(admin(), testEnv())).toBe(true);

      const res = await call(`${APP}/api/auth/logout`, { method: 'POST', headers: { Cookie: cookie, Origin: APP } });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });
      expect(res.headers.get('Set-Cookie')).toContain('better-auth.session_token=;');
      expect(await isAuthenticated(admin(), testEnv())).toBe(false);
    });

    it('succeeds without a session', async () => {
      const res = await call(`${APP}/api/auth/logout`, { method: 'POST' });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });
    });
  });

  describe("GAuth's answer (the ACS)", () => {
    it('is reachable as the cross-site form post it is, and refuses a bogus one', async () => {
      const res = await call(`${APP}/api/auth/sso/saml2/sp/acs/gauth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Origin: 'https://auth.gpeake.com',
          'Sec-Fetch-Site': 'same-site',
        },
        body: 'SAMLResponse=bm9wZQ%3D%3D',
      });
      // Better Auth handles it (and turns it away): not blocked before it gets there.
      expect([302, 400]).toContain(res.status);
      expect(res.headers.get('Set-Cookie') ?? '').not.toContain('session_token=');
    });

    it('is only on the admin address', async () => {
      const res = await call('https://www.gpeake.com/api/auth/sso/saml2/sp/acs/gauth', { method: 'POST', body: 'SAMLResponse=x' });
      expect(res.status).toBe(404);
    });
  });

  it('cannot sign in by any other route', async () => {
    for (const path of ['/api/auth/login', '/api/auth/sign-in/email', '/api/auth/sign-up/email']) {
      const res = await call(`${APP}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: APP },
        body: JSON.stringify({ username: 'admin', email: 'a@example.com', password: 'password123', name: 'x' }),
      });
      expect(res.status, path).not.toBe(200);
      expect(res.headers.get('Set-Cookie') ?? '', path).not.toContain('session_token=');
    }
  });
});
