/**
 * Admin Posts API Handlers Tests
 *
 * Tests for post management endpoints against D1.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import {
  handleAdminListPosts,
  handleAdminGetPost,
  handleAdminUpdatePost,
  handleAdminDeletePost,
  handleUnpublishPost,
} from '../../../handlers/api/posts';
import { getPost, getPostBySlug, listPosts } from '../../../dao/post.dao';

describe('Admin Posts API Handlers', () => {
  beforeAll(async () => {
    await env.DB.exec(
      "CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, title TEXT NOT NULL DEFAULT '', slug TEXT NOT NULL UNIQUE, content TEXT NOT NULL DEFAULT '', description TEXT, published_at TEXT NOT NULL, updated_at TEXT NOT NULL)"
    );
    await env.DB.exec("CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at DESC)");
    await env.DB.exec(
      "CREATE TABLE IF NOT EXISTS drafts (id TEXT PRIMARY KEY, title TEXT NOT NULL DEFAULT '', slug TEXT NOT NULL DEFAULT '', content TEXT NOT NULL DEFAULT '', description TEXT, share_token TEXT UNIQUE, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"
    );
  });

  beforeEach(async () => {
    await env.DB.exec('DELETE FROM posts');
    await env.DB.exec('DELETE FROM drafts');
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

  describe('handleAdminListPosts', () => {
    it('should return empty array when no posts exist', async () => {
      const response = await handleAdminListPosts(env);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual([]);
    });

    it('should return all posts', async () => {
      await insertPost({ title: 'Post 1', slug: 'post-1', content: 'Full content 1' });
      await insertPost({ title: 'Post 2', slug: 'post-2', content: 'Full content 2' });

      const response = await handleAdminListPosts(env);

      expect(response.status).toBe(200);
      const data = await response.json() as Array<{ title: string }>;
      expect(data).toHaveLength(2);
    });

    it('should include CORS headers', async () => {
      const response = await handleAdminListPosts(env);
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    });
  });

  describe('handleAdminGetPost', () => {
    it('should return 404 for non-existent post', async () => {
      const response = await handleAdminGetPost(env, 'non-existent');

      expect(response.status).toBe(404);
      const data = await response.json() as { error: string };
      expect(data.error).toBe('Not found');
    });

    it('should return post by ID', async () => {
      const { id } = await insertPost({ title: 'My Post', slug: 'my-post', content: 'Content' });

      const response = await handleAdminGetPost(env, id);

      expect(response.status).toBe(200);
      const data = await response.json() as { id: string; title: string };
      expect(data.id).toBe(id);
      expect(data.title).toBe('My Post');
    });
  });

  describe('handleAdminUpdatePost', () => {
    it('should return 404 for non-existent post', async () => {
      const request = new Request('http://localhost/api/admin/posts/non-existent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Title' }),
      });

      const response = await handleAdminUpdatePost(request, env, 'non-existent');

      expect(response.status).toBe(404);
    });

    it('should update post fields', async () => {
      const { id } = await insertPost({ title: 'Original', slug: 'original', content: 'Original content' });

      const request = new Request(`http://localhost/api/admin/posts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title', content: 'Updated content' }),
      });

      const response = await handleAdminUpdatePost(request, env, id);

      expect(response.status).toBe(200);
      const data = await response.json() as { title: string; content: string };
      expect(data.title).toBe('Updated Title');
      expect(data.content).toBe('Updated content');
    });

    it('should update slug and slug lookup', async () => {
      const { id } = await insertPost({ title: 'Post', slug: 'old-slug', content: 'Content' });

      const request = new Request(`http://localhost/api/admin/posts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: 'new-slug' }),
      });

      await handleAdminUpdatePost(request, env, id);

      const byOldSlug = await getPostBySlug(env.DB, 'old-slug');
      const byNewSlug = await getPostBySlug(env.DB, 'new-slug');

      expect(byOldSlug).toBeNull();
      expect(byNewSlug).not.toBeNull();
    });

    it('should return 400 for duplicate slug', async () => {
      await insertPost({ title: 'P1', slug: 'slug-1', content: 'C1' });
      const { id: post2Id } = await insertPost({ title: 'P2', slug: 'slug-2', content: 'C2' });

      const request = new Request(`http://localhost/api/admin/posts/${post2Id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: 'slug-1' }),
      });

      const response = await handleAdminUpdatePost(request, env, post2Id);

      expect(response.status).toBe(400);
      const data = await response.json() as { error: string };
      expect(data.error).toContain('already in use');
    });

    it('should update publishedAt', async () => {
      const { id } = await insertPost({ title: 'Post', slug: 'date-test', content: 'Content' });

      const newDate = '2020-06-15T10:30:00.000Z';
      const request = new Request(`http://localhost/api/admin/posts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publishedAt: newDate }),
      });

      const response = await handleAdminUpdatePost(request, env, id);

      expect(response.status).toBe(200);
      const data = await response.json() as { publishedAt: string };
      expect(data.publishedAt).toBe(newDate);
    });

    it('should preserve publishedAt when not provided', async () => {
      const originalDate = '2024-01-01T00:00:00.000Z';
      const { id } = await insertPost({ title: 'Post', slug: 'preserve-date', content: 'Content', publishedAt: originalDate });

      const request = new Request(`http://localhost/api/admin/posts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' }),
      });

      const response = await handleAdminUpdatePost(request, env, id);

      expect(response.status).toBe(200);
      const data = await response.json() as { publishedAt: string };
      expect(data.publishedAt).toBe(originalDate);
    });
  });

  describe('handleAdminDeletePost', () => {
    it('should return 404 for non-existent post', async () => {
      const response = await handleAdminDeletePost(env, 'non-existent');

      expect(response.status).toBe(404);
    });

    it('should delete post', async () => {
      const { id } = await insertPost({ title: 'To Delete', slug: 'to-delete', content: 'Content' });

      const response = await handleAdminDeletePost(env, id);

      expect(response.status).toBe(200);
      const data = await response.json() as { ok: boolean };
      expect(data.ok).toBe(true);

      const deleted = await getPost(env.DB, id);
      expect(deleted).toBeNull();
    });

    it('should delete slug lookup', async () => {
      const { id } = await insertPost({ title: 'To Delete', slug: 'to-delete', content: 'Content' });

      await handleAdminDeletePost(env, id);

      const bySlug = await getPostBySlug(env.DB, 'to-delete');
      expect(bySlug).toBeNull();
    });
  });

  describe('handleUnpublishPost', () => {
    it('should return 400 for non-existent post', async () => {
      const response = await handleUnpublishPost(env, 'non-existent');

      expect(response.status).toBe(400);
      const data = await response.json() as { error: string };
      expect(data.error).toBe('Post not found');
    });

    it('should unpublish post and return draft', async () => {
      const { id } = await insertPost({ title: 'Published Post', slug: 'published-post', content: 'Content' });

      const response = await handleUnpublishPost(env, id);

      expect(response.status).toBe(200);
      const data = await response.json() as { id: string; title: string; createdAt: string };
      expect(data.title).toBe('Published Post');
      expect(data.createdAt).toBeDefined();
    });

    it('should delete post after unpublishing', async () => {
      const { id } = await insertPost({ title: 'Post', slug: 'post', content: 'Content' });

      await handleUnpublishPost(env, id);

      const deletedPost = await getPost(env.DB, id);
      expect(deletedPost).toBeNull();
    });

    it('should create new draft after unpublishing', async () => {
      const { id } = await insertPost({ title: 'Post', slug: 'post', content: 'Content' });

      await handleUnpublishPost(env, id);

      const drafts = await env.DB.prepare('SELECT id, title FROM drafts').all<{ id: string; title: string }>();
      expect(drafts.results).toHaveLength(1);
      expect(drafts.results[0].title).toBe('Post');
    });

    it('should free up slug after unpublishing', async () => {
      const { id } = await insertPost({ title: 'Post', slug: 'reusable-slug', content: 'Content' });

      await handleUnpublishPost(env, id);

      const bySlug = await getPostBySlug(env.DB, 'reusable-slug');
      expect(bySlug).toBeNull();
    });
  });
});
