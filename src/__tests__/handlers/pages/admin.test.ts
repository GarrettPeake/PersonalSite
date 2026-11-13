/**
 * Admin Page Handler Tests
 *
 * Opening an admin page without a session goes straight to GAuth and comes
 * back to that page; failures show a page instead of redirecting forever.
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { adminPath, handleAdmin } from '../../../handlers/pages/admin';
import type { Env } from '../../../types';
import { APP, migrate, sessionCookie, testEnv } from '../../support/auth';

const mockAssetsFetch = vi.fn(() => Promise.resolve(new Response('admin page')));

let bindings: Env;
function open(path: string, cookie?: string, env: Env = bindings) {
  const url = new URL(path, APP);
  const request = new Request(url, cookie ? { headers: { Cookie: cookie } } : {});
  return handleAdmin(request, env, url.pathname);
}
const cookies = (res: Response) => (res.headers as Headers & { getSetCookie(): string[] }).getSetCookie();

describe('Admin Page Handler', () => {
  beforeAll(migrate);
  beforeEach(() => {
    bindings = { ...testEnv(), ASSETS: { fetch: mockAssetsFetch } } as unknown as Env;
    mockAssetsFetch.mockClear();
  });

  describe('without a session', () => {
    it('sends every admin page straight to GAuth', async () => {
      for (const path of ['/admin', '/admin/', '/admin/posts', '/admin/editor?id=abc']) {
        const res = await open(path);
        expect(res.status, path).toBe(302);
        expect(res.headers.get('Location'), path).toMatch(/^https:\/\/auth\.gpeake\.com\/saml\/sso\?SAMLRequest=/);
        expect(mockAssetsFetch).not.toHaveBeenCalled();
      }
    });

    it('/admin/login goes straight to GAuth too: there is no login page', async () => {
      const res = await open('/admin/login?next=%2Fadmin%2Fphotos');
      expect(res.status).toBe(302);
      expect(res.headers.get('Location')).toMatch(/^https:\/\/auth\.gpeake\.com\/saml\/sso\?/);
    });

    it('ties the sign-in to this browser and counts the try', async () => {
      const set = cookies(await open('/admin/posts'));
      expect(set.some((c) => /relay_state=/.test(c))).toBe(true);
      expect(set.some((c) => /^gp_signin_tries=1;/.test(c))).toBe(true);
    });

    it('after three quick tries, waits for a click instead of looping', async () => {
      const res = await open('/admin/posts', 'gp_signin_tries=3');
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('Signing in didn&#39;t complete.');
      expect(html).toContain('href="/admin/login?retry=1&#38;next=%2Fadmin%2Fposts"');
      // The click starts over.
      const retry = await open('/admin/login?retry=1&next=%2Fadmin%2Fposts', 'gp_signin_tries=3');
      expect(retry.status).toBe(302);
      expect(cookies(retry).some((c) => /^gp_signin_tries=1;/.test(c))).toBe(true);
    });

    it('shows what GAuth said went wrong, without redirecting again', async () => {
      const res = await open('/admin/login?error=no_role');
      expect(res.status).toBe(200);
      expect(await res.text()).toContain('doesn&#39;t have the owner role');

      const other = await open('/admin/posts?error=account_not_linked');
      expect(other.status).toBe(200);
      expect(await other.text()).toContain('(account_not_linked)');
    });

    it('never echoes markup from the error code', async () => {
      const res = await open('/admin/login?error=%3Cscript%3Ealert(1)%3C%2Fscript%3E');
      const html = await res.text();
      expect(html).not.toContain('<script>alert');
    });

    it('says sign-in is unavailable (503) when it is not configured', async () => {
      const broken = { ...bindings, BETTER_AUTH_SECRET: '' } as Env;
      const res = await open('/admin/posts', undefined, broken);
      expect(res.status).toBe(503);
      expect(await res.text()).toContain('Sign-in is unavailable right now.');
    });
  });

  describe('with a session', () => {
    it('serves admin pages to the owner', async () => {
      const cookie = await sessionCookie(['owner']);
      const res = await open('/admin/posts', cookie);
      expect(await res.text()).toBe('admin page');
      expect(mockAssetsFetch).toHaveBeenCalledOnce();
    });

    it('clears the try count once in', async () => {
      const cookie = await sessionCookie(['owner']);
      const res = await open('/admin', `${cookie}; gp_signin_tries=2`);
      expect(cookies(res).some((c) => /^gp_signin_tries=;.*Max-Age=0/.test(c))).toBe(true);
    });

    it('/admin/login sends the owner on to the page asked for', async () => {
      const cookie = await sessionCookie(['owner']);
      const res = await open('/admin/login?next=%2Fadmin%2Feditor%3Fid%3Dabc', cookie);
      expect(res.status).toBe(302);
      expect(res.headers.get('Location')).toBe(`${APP}/admin/editor?id=abc`);
    });

    it('does not let a session without the owner role in', async () => {
      const cookie = await sessionCookie(['editor']);
      const res = await open('/admin/posts', cookie);
      expect(res.status).toBe(302);
      expect(res.headers.get('Location')).toMatch(/^https:\/\/auth\.gpeake\.com\//);
      expect(mockAssetsFetch).not.toHaveBeenCalled();
    });
  });

  it('keeps the admin on one address', async () => {
    const request = new Request('https://www.gpeake.com/admin/posts?x=1');
    const res = await handleAdmin(request, bindings, '/admin/posts');
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe(`${APP}/admin/posts?x=1`);
  });

  describe('adminPath', () => {
    it('keeps admin pages and nothing else', () => {
      expect(adminPath('/admin/editor?id=1')).toBe('/admin/editor?id=1');
      expect(adminPath('/admin')).toBe('/admin');
      expect(adminPath(null)).toBe('/admin');
      expect(adminPath('//evil.example/admin')).toBe('/admin');
      expect(adminPath('https://evil.example/admin')).toBe('/admin');
      expect(adminPath('/administrator')).toBe('/admin');
      expect(adminPath('/admin\\..\\x')).toBe('/admin');
      expect(adminPath('/admin/login?next=/admin/x')).toBe('/admin');
      expect(adminPath('/')).toBe('/admin');
    });
  });
});
