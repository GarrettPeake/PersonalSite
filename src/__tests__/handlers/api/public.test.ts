/**
 * Public API Handlers Tests
 *
 * Tests for public API endpoints (posts listing, get post, tracking).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { handleListPosts, handleGetPost, handleTrack } from '../../../handlers/api/public';
import { createDraft } from '../../../dao/draft.dao';
import { publishDraft } from '../../../dao/post.dao';
import { createTrackingSlug, getTrackingSlug } from '../../../dao/tracking.dao';
import { KV_PREFIX } from '../../../types';

describe('Public API Handlers', () => {
  beforeEach(async () => {
    // Clean up all related keys
    const prefixes = [KV_PREFIX.POST, KV_PREFIX.POST_SLUG, KV_PREFIX.DRAFT, KV_PREFIX.TRACKING];
    for (const prefix of prefixes) {
      const keys = await env.KV.list({ prefix });
      for (const key of keys.keys) {
        await env.KV.delete(key.name);
      }
    }
    await env.KV.delete(KV_PREFIX.INDEX_POSTS);
    await env.KV.delete(KV_PREFIX.INDEX_DRAFTS);
    await env.KV.delete(KV_PREFIX.INDEX_TRACKING);
  });

  describe('handleListPosts', () => {
    it('should return empty array when no posts exist', async () => {
      const response = await handleListPosts(env);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual([]);
    });

    it('should return posts with description if provided', async () => {
      const draft = await createDraft(env.KV, {
        title: 'Test Post',
        slug: 'test-post',
        content: 'This is the full content.',
        description: 'A short description for the listing.',
      });
      await publishDraft(env.KV, draft.id);

      const response = await handleListPosts(env);

      expect(response.status).toBe(200);
      const data = await response.json() as Array<{ title: string; description?: string }>;
      expect(data).toHaveLength(1);
      expect(data[0].title).toBe('Test Post');
      expect(data[0].description).toBe('A short description for the listing.');
    });

    it('should return undefined description if not provided', async () => {
      const draft = await createDraft(env.KV, {
        title: 'Test Post',
        slug: 'test-post',
        content: 'This is the full content.',
      });
      await publishDraft(env.KV, draft.id);

      const response = await handleListPosts(env);

      expect(response.status).toBe(200);
      const data = await response.json() as Array<{ title: string; description?: string }>;
      expect(data).toHaveLength(1);
      expect(data[0].description).toBeUndefined();
    });

    it('should not include full content in list response', async () => {
      const draft = await createDraft(env.KV, {
        title: 'Test Post',
        slug: 'test-post',
        content: 'Full content here',
      });
      await publishDraft(env.KV, draft.id);

      const response = await handleListPosts(env);

      const data = await response.json() as Array<{ content?: string }>;
      expect(data[0].content).toBeUndefined();
    });

    it('should include CORS headers', async () => {
      const response = await handleListPosts(env);

      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    });

    it('should return posts in order (newest first)', async () => {
      const draft1 = await createDraft(env.KV, { title: 'Post 1', slug: 'post-1', content: 'C1' });
      const draft2 = await createDraft(env.KV, { title: 'Post 2', slug: 'post-2', content: 'C2' });
      const draft3 = await createDraft(env.KV, { title: 'Post 3', slug: 'post-3', content: 'C3' });

      await publishDraft(env.KV, draft1.id);
      await publishDraft(env.KV, draft2.id);
      await publishDraft(env.KV, draft3.id);

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
      const draft = await createDraft(env.KV, {
        title: 'My Post',
        slug: 'my-post',
        content: 'Post content',
      });
      await publishDraft(env.KV, draft.id);

      const response = await handleGetPost(env, 'my-post');

      expect(response.status).toBe(200);
      const data = await response.json() as { title: string; slug: string; content: string };
      expect(data.title).toBe('My Post');
      expect(data.slug).toBe('my-post');
      expect(data.content).toBe('Post content');
    });

    it('should include full content in response', async () => {
      const draft = await createDraft(env.KV, {
        title: 'Post',
        slug: 'post',
        content: 'Full content here',
      });
      await publishDraft(env.KV, draft.id);

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
      await createTrackingSlug(env.KV, 'Test', 'test1');

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

      const tracking = await getTrackingSlug(env.KV, 'test1');
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
  });
});
