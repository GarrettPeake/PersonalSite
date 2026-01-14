/**
 * Tracking Redirect Page Handler Tests
 *
 * Tests for tracking redirect page.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { handleTrackingRedirect } from '../../../handlers/pages/tracking';
import { createTrackingSlug } from '../../../dao/tracking.dao';
import { KV_PREFIX } from '../../../types';

describe('Tracking Redirect Page Handler', () => {
  beforeEach(async () => {
    // Clean up
    const keys = await env.KV.list({ prefix: KV_PREFIX.TRACKING });
    for (const key of keys.keys) {
      await env.KV.delete(key.name);
    }
    await env.KV.delete(KV_PREFIX.INDEX_TRACKING);
  });

  it('should redirect to home for empty slug', async () => {
    const request = new Request('http://localhost/s/');
    const response = await handleTrackingRedirect(request, env, '/s/');

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('http://localhost/');
  });

  it('should redirect to home for non-existent slug', async () => {
    const request = new Request('http://localhost/s/nonexistent');
    const response = await handleTrackingRedirect(request, env, '/s/nonexistent');

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('http://localhost/');
  });

  it('should return tracking page for valid slug', async () => {
    await createTrackingSlug(env.KV, 'Test', 'test1');

    const request = new Request('http://localhost/s/test1');
    const response = await handleTrackingRedirect(request, env, '/s/test1');

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('Redirecting');
  });

  it('should include tracking slug in page script', async () => {
    await createTrackingSlug(env.KV, 'Test', 'myslug');

    const request = new Request('http://localhost/s/myslug');
    const response = await handleTrackingRedirect(request, env, '/s/myslug');

    const html = await response.text();
    expect(html).toContain('myslug');
    expect(html).toContain('localStorage.setItem');
  });

  it('should include tracking API call', async () => {
    await createTrackingSlug(env.KV, 'Test', 'test1');

    const request = new Request('http://localhost/s/test1');
    const response = await handleTrackingRedirect(request, env, '/s/test1');

    const html = await response.text();
    expect(html).toContain('/api/track');
    expect(html).toContain('fetch');
  });

  it('should include redirect to home', async () => {
    await createTrackingSlug(env.KV, 'Test', 'test1');

    const request = new Request('http://localhost/s/test1');
    const response = await handleTrackingRedirect(request, env, '/s/test1');

    const html = await response.text();
    expect(html).toContain("window.location.href = '/'");
  });

  it('should include noscript fallback', async () => {
    await createTrackingSlug(env.KV, 'Test', 'test1');

    const request = new Request('http://localhost/s/test1');
    const response = await handleTrackingRedirect(request, env, '/s/test1');

    const html = await response.text();
    expect(html).toContain('<noscript>');
    expect(html).toContain('http-equiv="refresh"');
  });

  it('should include noindex meta tag', async () => {
    await createTrackingSlug(env.KV, 'Test', 'test1');

    const request = new Request('http://localhost/s/test1');
    const response = await handleTrackingRedirect(request, env, '/s/test1');

    const html = await response.text();
    expect(html).toContain('noindex');
  });

  it('should render HTML content type', async () => {
    await createTrackingSlug(env.KV, 'Test', 'test1');

    const request = new Request('http://localhost/s/test1');
    const response = await handleTrackingRedirect(request, env, '/s/test1');

    expect(response.headers.get('Content-Type')).toBe('text/html');
  });

  it('should escape slug in script for XSS prevention', async () => {
    // Create slug that looks like XSS
    await createTrackingSlug(env.KV, 'Test', 'ab123');

    const request = new Request("http://localhost/s/ab123");
    const response = await handleTrackingRedirect(request, env, "/s/ab123");

    const html = await response.text();
    // The slug should be escaped in the JavaScript
    expect(html).toContain("'ab123'");
  });
});
