/**
 * Public API Handlers Tests
 *
 * Tests for public API endpoints (posts listing, get post, tracking) against D1.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { handleListPosts, handleGetPost, handleTrack } from '../../../handlers/api/public';
import { createTrackingSlug, getTrackingSlug } from '../../../dao/tracking.dao';

describe('Public API Handlers', () => {
  beforeAll(async () => {
    // Create posts table
    await env.DB.exec(
      "CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, title TEXT NOT NULL DEFAULT '', slug TEXT NOT NULL UNIQUE, content TEXT NOT NULL DEFAULT '', description TEXT, published_at TEXT NOT NULL, updated_at TEXT NOT NULL)"
    );
    await env.DB.exec('CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at DESC)');

    // Create tracking tables
    await env.DB.exec('PRAGMA foreign_keys = ON');
    await env.DB.exec("CREATE TABLE IF NOT EXISTS tracking_slugs (slug TEXT PRIMARY KEY, tag TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL)");
    await env.DB.exec('CREATE INDEX IF NOT EXISTS idx_tracking_slugs_created_at ON tracking_slugs(created_at DESC)');
    await env.DB.exec("CREATE TABLE IF NOT EXISTS tracking_events (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL REFERENCES tracking_slugs(slug) ON DELETE CASCADE, timestamp TEXT NOT NULL, page TEXT NOT NULL, referrer TEXT, user_agent TEXT)");
    await env.DB.exec('CREATE INDEX IF NOT EXISTS idx_tracking_events_slug ON tracking_events(slug, timestamp ASC)');
  });

  beforeEach(async () => {
    await env.DB.exec('DELETE FROM posts');
    await env.DB.exec('DELETE FROM tracking_events');
    await env.DB.exec('DELETE FROM tracking_slugs');
    // Clean up rate limit keys in KV
    const keys = await env.KV.list({ prefix: 'trackrate:' });
    for (const key of keys.keys) {
      await env.KV.delete(key.name);
    }
  });

  // Helper to insert a post directly
  async function insertPost(overrides: Partial<{ id: string; title: string; slug: string; content: string; description: string | null; publishedAt: string }> = {}) {
    const id = overrides.id ?? crypto.randomUUID();
    const now = new Date().toISOString();
    await env.DB.prepare(
      'INSERT INTO posts (id, title, slug, content, description, published_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      id,
      overrides.title ?? 'Test Post',
      overrides.slug ?? 'test-post',
      overrides.content ?? 'Test content',
      overrides.description ?? null,
      overrides.publishedAt ?? now,
      now
    ).run();
    return { id, publishedAt: overrides.publishedAt ?? now };
  }

  describe('handleListPosts', () => {
    it('should return empty array when no posts exist', async () => {
      const response = await handleListPosts(env);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual([]);
    });

    it('should return posts with description if provided', async () => {
      await insertPost({
        title: 'Test Post',
        slug: 'test-post',
        content: 'This is the full content.',
        description: 'A short description for the listing.',
      });

      const response = await handleListPosts(env);

      expect(response.status).toBe(200);
      const data = await response.json() as Array<{ title: string; description?: string }>;
      expect(data).toHaveLength(1);
      expect(data[0].title).toBe('Test Post');
      expect(data[0].description).toBe('A short description for the listing.');
    });

    it('should return null description if not provided', async () => {
      await insertPost({
        title: 'Test Post',
        slug: 'test-post',
        content: 'This is the full content.',
      });

      const response = await handleListPosts(env);

      expect(response.status).toBe(200);
      const data = await response.json() as Array<{ title: string; description?: string | null }>;
      expect(data).toHaveLength(1);
      expect(data[0].description).toBeFalsy();
    });

    it('should not include full content in list response', async () => {
      await insertPost({
        title: 'Test Post',
        slug: 'test-post',
        content: 'Full content here',
      });

      const response = await handleListPosts(env);

      const data = await response.json() as Array<{ content?: string }>;
      expect(data[0].content).toBeUndefined();
    });

    it('should include CORS headers', async () => {
      const response = await handleListPosts(env);

      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    });

    it('should return posts in order (newest first)', async () => {
      await insertPost({ title: 'Post 1', slug: 'post-1', content: 'C1', publishedAt: '2024-01-01T00:00:00.000Z' });
      await insertPost({ title: 'Post 2', slug: 'post-2', content: 'C2', publishedAt: '2024-02-01T00:00:00.000Z' });
      await insertPost({ title: 'Post 3', slug: 'post-3', content: 'C3', publishedAt: '2024-03-01T00:00:00.000Z' });

      const response = await handleListPosts(env);
      const data = await response.json() as Array<{ title: string }>;

      expect(data[0].title).toBe('Post 3');
      expect(data[1].title).toBe('Post 2');
      expect(data[2].title).toBe('Post 1');
    });
  });

  describe('handleGetPost', () => {
    it('should return 404 for non-existent post', async () => {
      const response = await handleGetPost(env, 'non-existent-slug');

      expect(response.status).toBe(404);
      const data = await response.json() as { error: string };
      expect(data.error).toBe('Post not found');
    });

    it('should return post by slug', async () => {
      await insertPost({
        title: 'My Post',
        slug: 'my-post',
        content: 'Post content',
      });

      const response = await handleGetPost(env, 'my-post');

      expect(response.status).toBe(200);
      const data = await response.json() as { title: string; slug: string; content: string };
      expect(data.title).toBe('My Post');
      expect(data.slug).toBe('my-post');
      expect(data.content).toBe('Post content');
    });

    it('should include full content in response', async () => {
      await insertPost({
        title: 'Post',
        slug: 'post',
        content: 'Full content here',
      });

      const response = await handleGetPost(env, 'post');
      const data = await response.json() as { content: string };

      expect(data.content).toBe('Full content here');
    });

    it('should include CORS headers', async () => {
      const response = await handleGetPost(env, 'any-slug');

      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    });
  });

  describe('handleTrack', () => {
    it('should return 400 for missing slug', async () => {
      const request = new Request('http://localhost/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: '/' }),
      });

      const response = await handleTrack(request, env);

      expect(response.status).toBe(400);
      const data = await response.json() as { error: string };
      expect(data.error).toBe('Missing slug or page');
    });

    it('should return 400 for missing page', async () => {
      const request = new Request('http://localhost/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: 'test' }),
      });

      const response = await handleTrack(request, env);

      expect(response.status).toBe(400);
      const data = await response.json() as { error: string };
      expect(data.error).toBe('Missing slug or page');
    });

    it('should record event for valid slug', async () => {
      await createTrackingSlug(env.DB, 'Test', 'test1');

      const request = new Request('http://localhost/api/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'TestBrowser/1.0',
        },
        body: JSON.stringify({
          slug: 'test1',
          page: '/blog/my-post',
          referrer: 'https://google.com',
        }),
      });

      const response = await handleTrack(request, env);

      expect(response.status).toBe(200);
      const data = await response.json() as { ok: boolean };
      expect(data.ok).toBe(true);

      const tracking = await getTrackingSlug(env.DB, 'test1');
      expect(tracking!.events).toHaveLength(1);
      expect(tracking!.events[0].page).toBe('/blog/my-post');
      expect(tracking!.events[0].referrer).toBe('https://google.com');
      expect(tracking!.events[0].userAgent).toBe('TestBrowser/1.0');
    });

    it('should return ok even for non-existent slug', async () => {
      const request = new Request('http://localhost/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: 'nonexistent',
          page: '/',
        }),
      });

      const response = await handleTrack(request, env);

      expect(response.status).toBe(200);
      const data = await response.json() as { ok: boolean };
      expect(data.ok).toBe(true);
    });

    it('should include CORS headers', async () => {
      const request = new Request('http://localhost/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: 'test', page: '/' }),
      });

      const response = await handleTrack(request, env);

      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    });

    it('should truncate long page and referrer fields', async () => {
      await createTrackingSlug(env.DB, 'Test', 'trunc');
      const longPage = 'x'.repeat(5000);
      const longReferrer = 'r'.repeat(5000);

      const request = new Request('http://localhost/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: 'trunc',
          page: longPage,
          referrer: longReferrer,
        }),
      });

      const response = await handleTrack(request, env);
      expect(response.status).toBe(200);

      const tracking = await getTrackingSlug(env.DB, 'trunc');
      expect(tracking!.events[0].page.length).toBe(2048);
      expect(tracking!.events[0].referrer!.length).toBe(2048);
    });

    it('should return 429 when rate limit is exceeded', async () => {
      // Seed the rate limit counter just below the limit
      await env.KV.put('trackrate:127.0.0.1', '100', { expirationTtl: 60 });

      const request = new Request('http://localhost/api/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '127.0.0.1',
        },
        body: JSON.stringify({ slug: 'test', page: '/' }),
      });

      const response = await handleTrack(request, env);
      expect(response.status).toBe(429);
      const data = await response.json() as { error: string };
      expect(data.error).toBe('Rate limit exceeded');
    });
  });
});
