/**
 * Auth Middleware Tests
 *
 * The admin session check: a GAuth session with the owner role, and nothing else.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { hasSessionCookie, isAuthenticated } from '../../middleware/auth';
import { APP, migrate, sessionCookie, testEnv } from '../support/auth';

const withCookie = (cookie?: string) =>
  new Request(`${APP}/api/admin/drafts`, cookie ? { headers: { Cookie: cookie } } : {});

describe('Auth Middleware', () => {
  beforeAll(migrate);

  describe('hasSessionCookie', () => {
    it('sees Better Auth session cookies, prefixed or not', () => {
      expect(hasSessionCookie(withCookie('__Secure-better-auth.session_token=abc'))).toBe(true);
      expect(hasSessionCookie(withCookie('a=1; better-auth.session_token=abc'))).toBe(true);
    });

    it('ignores other cookies, including the old password session', () => {
      expect(hasSessionCookie(withCookie())).toBe(false);
      expect(hasSessionCookie(withCookie('gp_session=abc; theme=dark'))).toBe(false);
    });
  });

  describe('isAuthenticated', () => {
    it('is true for a GAuth session with the owner role', async () => {
      const cookie = await sessionCookie(['owner']);
      expect(await isAuthenticated(withCookie(cookie), testEnv())).toBe(true);
    });

    it('is false for a session without the owner role', async () => {
      const cookie = await sessionCookie(['editor']);
      expect(await isAuthenticated(withCookie(cookie), testEnv())).toBe(false);
    });

    it('is false without a cookie, or with a forged one', async () => {
      expect(await isAuthenticated(withCookie(), testEnv())).toBe(false);
      expect(await isAuthenticated(withCookie('__Secure-better-auth.session_token=forged.sig'), testEnv())).toBe(false);
    });

    it('is false for the old password session cookie', async () => {
      expect(await isAuthenticated(withCookie('gp_session=00000000-0000-0000-0000-000000000000'), testEnv())).toBe(false);
    });

    it('is false (not an error) when sign-in is not configured', async () => {
      const cookie = await sessionCookie(['owner']);
      const broken = { ...testEnv(), BETTER_AUTH_SECRET: '', GAUTH_CERTS: '' };
      expect(await isAuthenticated(withCookie(cookie), broken)).toBe(false);
    });
  });
});
