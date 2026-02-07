/**
 * Admin Posts API Handlers Tests
 *
 * Tests for post management endpoints.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import {
  handleAdminListPosts,
  handleAdminGetPost,
  handleAdminUpdatePost,
  handleAdminDeletePost,
  handleUnpublishPost,
} from '../../../handlers/api/posts';
import { createDraft, listDrafts } from '../../../dao/draft.dao';
import { publishDraft, getPost, getPostBySlug, listPosts } from '../../../dao/post.dao';
import { KV_PREFIX } from '../../../types';

describe('Admin Posts API Handlers', () => {
  beforeEach(async () => {
    // Clean up all related keys
    const prefixes = [KV_PREFIX.POST, KV_PREFIX.POST_SLUG, KV_PREFIX.DRAFT];
    for (const prefix of prefixes) {
      const keys = await env.KV.list({ prefix });
      for (const key of keys.keys) {
        await env.KV.delete(key.name);
      }
    }
    await env.KV.delete(KV_PREFIX.INDEX_POSTS);
    await env.KV.delete(KV_PREFIX.INDEX_DRAFTS);
  });

  describe('handleAdminListPosts', () => {
    it('should return empty array when no posts exist', async () => {
      const response = await handleAdminListPosts(env);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual([]);
    });

    it('should return all posts with full content', async () => {
      const draft1 = await createDraft(env.KV, {
        title: 'Post 1',
        slug: 'post-1',
        content: 'Full content 1',
      });
      const draft2 = await createDraft(env.KV, {
        title: 'Post 2',
        slug: 'post-2',
        content: 'Full content 2',
      });
      await publishDraft(env.KV, draft1.id);
      await publishDraft(env.KV, draft2.id);

      const response = await handleAdminListPosts(env);

      expect(response.status).toBe(200);
      const data = await response.json() as Array<{ title: string; content: string }>;
      expect(data).toHaveLength(2);
      // Admin list includes full content
      expect(data[0].content).toBeDefined();
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
      const draft = await createDraft(env.KV, {
        title: 'My Post',
        slug: 'my-post',
        content: 'Content',
      });
      const post = await publishDraft(env.KV, draft.id);

      const response = await handleAdminGetPost(env, post.id);

      expect(response.status).toBe(200);
      const data = await response.json() as { id: string; title: string };
      expect(data.id).toBe(post.id);
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
      const draft = await createDraft(env.KV, {
        title: 'Original',
        slug: 'original',
        content: 'Original content',
      });
      const post = await publishDraft(env.KV, draft.id);

      const request = new Request(`http://localhost/api/admin/posts/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title', content: 'Updated content' }),
      });

      const response = await handleAdminUpdatePost(request, env, post.id);

      expect(response.status).toBe(200);
      const data = await response.json() as { title: string; content: string };
      expect(data.title).toBe('Updated Title');
      expect(data.content).toBe('Updated content');
    });

    it('should update slug and slug lookup', async () => {
      const draft = await createDraft(env.KV, {
        title: 'Post',
        slug: 'old-slug',
        content: 'Content',
      });
      const post = await publishDraft(env.KV, draft.id);

      const request = new Request(`http://localhost/api/admin/posts/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: 'new-slug' }),
      });

      await handleAdminUpdatePost(request, env, post.id);

      const byOldSlug = await getPostBySlug(env.KV, 'old-slug');
      const byNewSlug = await getPostBySlug(env.KV, 'new-slug');

      expect(byOldSlug).toBeNull();
      expect(byNewSlug).not.toBeNull();
    });

    it('should return 400 for duplicate slug', async () => {
      const draft1 = await createDraft(env.KV, { title: 'P1', slug: 'slug-1', content: 'C1' });
      const draft2 = await createDraft(env.KV, { title: 'P2', slug: 'slug-2', content: 'C2' });
      await publishDraft(env.KV, draft1.id);
      const post2 = await publishDraft(env.KV, draft2.id);

      const request = new Request(`http://localhost/api/admin/posts/${post2.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: 'slug-1' }),
      });

      const response = await handleAdminUpdatePost(request, env, post2.id);

      expect(response.status).toBe(400);
      const data = await response.json() as { error: string };
      expect(data.error).toContain('already in use');
    });

    it('should update publishedAt', async () => {
      const draft = await createDraft(env.KV, {
        title: 'Post',
        slug: 'date-test',
        content: 'Content',
      });
      const post = await publishDraft(env.KV, draft.id);

      const newDate = '2020-06-15T10:30:00.000Z';
      const request = new Request(`http://localhost/api/admin/posts/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publishedAt: newDate }),
      });

      const response = await handleAdminUpdatePost(request, env, post.id);

      expect(response.status).toBe(200);
      const data = await response.json() as { publishedAt: string };
      expect(data.publishedAt).toBe(newDate);
    });

    it('should preserve publishedAt when not provided', async () => {
      const draft = await createDraft(env.KV, {
        title: 'Post',
        slug: 'preserve-date',
        content: 'Content',
      });
      const post = await publishDraft(env.KV, draft.id);

      const request = new Request(`http://localhost/api/admin/posts/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' }),
      });

      const response = await handleAdminUpdatePost(request, env, post.id);

      expect(response.status).toBe(200);
      const data = await response.json() as { publishedAt: string };
      expect(data.publishedAt).toBe(post.publishedAt);
    });
  });

  describe('handleAdminDeletePost', () => {
    it('should return 404 for non-existent post', async () => {
      const response = await handleAdminDeletePost(env, 'non-existent');

      expect(response.status).toBe(404);
    });

    it('should delete post', async () => {
      const draft = await createDraft(env.KV, {
        title: 'To Delete',
        slug: 'to-delete',
        content: 'Content',
      });
      const post = await publishDraft(env.KV, draft.id);

      const response = await handleAdminDeletePost(env, post.id);

      expect(response.status).toBe(200);
      const data = await response.json() as { ok: boolean };
      expect(data.ok).toBe(true);

      const deleted = await getPost(env.KV, post.id);
      expect(deleted).toBeNull();
    });

    it('should delete slug lookup', async () => {
      const draft = await createDraft(env.KV, {
        title: 'To Delete',
        slug: 'to-delete',
        content: 'Content',
      });
      const post = await publishDraft(env.KV, draft.id);

      await handleAdminDeletePost(env, post.id);

      const bySlug = await getPostBySlug(env.KV, 'to-delete');
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
      const draft = await createDraft(env.KV, {
        title: 'Published Post',
        slug: 'published-post',
        content: 'Content',
      });
      const post = await publishDraft(env.KV, draft.id);

      const response = await handleUnpublishPost(env, post.id);

      expect(response.status).toBe(200);
      const data = await response.json() as { id: string; title: string; createdAt: string };
      expect(data.title).toBe('Published Post');
      expect(data.createdAt).toBeDefined();
    });

    it('should delete post after unpublishing', async () => {
      const draft = await createDraft(env.KV, {
        title: 'Post',
        slug: 'post',
        content: 'Content',
      });
      const post = await publishDraft(env.KV, draft.id);

      await handleUnpublishPost(env, post.id);

      const deletedPost = await getPost(env.KV, post.id);
      expect(deletedPost).toBeNull();
    });

    it('should create new draft after unpublishing', async () => {
      const draft = await createDraft(env.KV, {
        title: 'Post',
        slug: 'post',
        content: 'Content',
      });
      const post = await publishDraft(env.KV, draft.id);

      await handleUnpublishPost(env, post.id);

      const drafts = await listDrafts(env.KV);
      expect(drafts).toHaveLength(1);
      expect(drafts[0].title).toBe('Post');
    });

    it('should free up slug after unpublishing', async () => {
      const draft = await createDraft(env.KV, {
        title: 'Post',
        slug: 'reusable-slug',
        content: 'Content',
      });
      const post = await publishDraft(env.KV, draft.id);

      await handleUnpublishPost(env, post.id);

      // Slug should be free
      const bySlug = await getPostBySlug(env.KV, 'reusable-slug');
      expect(bySlug).toBeNull();
    });
  });
});
