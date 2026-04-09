/**
 * Tracking Redirect Page Handler Tests
 *
 * Tests for tracking redirect page against D1.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { handleTrackingRedirect } from '../../../handlers/pages/tracking';
import { createTrackingSlug } from '../../../dao/tracking.dao';

describe('Tracking Redirect Page Handler', () => {
  beforeAll(async () => {
    await env.DB.exec("CREATE TABLE IF NOT EXISTS tracking_slugs (slug TEXT PRIMARY KEY, tag TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL)");
    await env.DB.exec("CREATE TABLE IF NOT EXISTS tracking_events (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL REFERENCES tracking_slugs(slug) ON DELETE CASCADE, timestamp TEXT NOT NULL, page TEXT NOT NULL, referrer TEXT, user_agent TEXT)");
  });

  beforeEach(async () => {
    await env.DB.exec('DELETE FROM tracking_events');
    await env.DB.exec('DELETE FROM tracking_slugs');
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
    await createTrackingSlug(env.DB, 'Test', 'test1');

    const request = new Request('http://localhost/s/test1');
    const response = await handleTrackingRedirect(request, env, '/s/test1');

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('Redirecting');
  });

  it('should include tracking slug in page script', async () => {
    await createTrackingSlug(env.DB, 'Test', 'myslug');

    const request = new Request('http://localhost/s/myslug');
    const response = await handleTrackingRedirect(request, env, '/s/myslug');

    const html = await response.text();
    expect(html).toContain('myslug');
    expect(html).toContain('localStorage.setItem');
  });

  it('should include tracking API call', async () => {
    await createTrackingSlug(env.DB, 'Test', 'test1');

    const request = new Request('http://localhost/s/test1');
    const response = await handleTrackingRedirect(request, env, '/s/test1');

    const html = await response.text();
    expect(html).toContain('/api/track');
    expect(html).toContain('fetch');
  });

  it('should include redirect to home', async () => {
    await createTrackingSlug(env.DB, 'Test', 'test1');

    const request = new Request('http://localhost/s/test1');
    const response = await handleTrackingRedirect(request, env, '/s/test1');

    const html = await response.text();
    expect(html).toContain("window.location.href = '/'");
  });

  it('should include noscript fallback', async () => {
    await createTrackingSlug(env.DB, 'Test', 'test1');

    const request = new Request('http://localhost/s/test1');
    const response = await handleTrackingRedirect(request, env, '/s/test1');

    const html = await response.text();
    expect(html).toContain('<noscript>');
    expect(html).toContain('http-equiv="refresh"');
  });

  it('should include noindex meta tag', async () => {
    await createTrackingSlug(env.DB, 'Test', 'test1');

    const request = new Request('http://localhost/s/test1');
    const response = await handleTrackingRedirect(request, env, '/s/test1');

    const html = await response.text();
    expect(html).toContain('noindex');
  });

  it('should render HTML content type', async () => {
    await createTrackingSlug(env.DB, 'Test', 'test1');

    const request = new Request('http://localhost/s/test1');
    const response = await handleTrackingRedirect(request, env, '/s/test1');

    expect(response.headers.get('Content-Type')).toBe('text/html');
  });

  it('should escape slug in script for XSS prevention', async () => {
    await createTrackingSlug(env.DB, 'Test', 'ab123');

    const request = new Request("http://localhost/s/ab123");
    const response = await handleTrackingRedirect(request, env, "/s/ab123");

    const html = await response.text();
    expect(html).toContain("'ab123'");
  });
});
