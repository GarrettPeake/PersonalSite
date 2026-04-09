/**
 * Post DAO Tests
 *
 * Tests for post CRUD operations and publish/unpublish against D1.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import {
  getPost,
  getPostBySlug,
  listPosts,
  updatePost,
  deletePost,
  publishDraft,
  unpublishPost,
} from '../../dao/post.dao';

describe('Post DAO', () => {
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

  // Helper to insert a post directly for tests that don't need publish flow
  async function insertPost(overrides: Partial<{ id: string; title: string; slug: string; content: string; description: string | null; publishedAt: string; updatedAt: string }> = {}) {
    const id = overrides.id ?? crypto.randomUUID();
    const now = new Date().toISOString();
    const title = overrides.title ?? 'Test Post';
    const slug = overrides.slug ?? 'test-post';
    const content = overrides.content ?? 'Test content';
    const description = overrides.description ?? null;
    const publishedAt = overrides.publishedAt ?? now;
    const updatedAt = overrides.updatedAt ?? now;

    await env.DB.prepare(
      'INSERT INTO posts (id, title, slug, content, description, published_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, title, slug, content, description, publishedAt, updatedAt).run();

    return { id, title, slug, content, description, publishedAt, updatedAt };
  }

  // Helper to insert a draft directly for publish tests
  async function insertDraft(overrides: Partial<{ id: string; title: string; slug: string; content: string; description: string | null }> = {}) {
    const id = overrides.id ?? crypto.randomUUID();
    const now = new Date().toISOString();
    const title = overrides.title ?? 'Test Draft';
    const slug = overrides.slug ?? 'test-draft';
    const content = overrides.content ?? 'Draft content';
    const description = overrides.description ?? null;

    await env.DB.prepare(
      'INSERT INTO drafts (id, title, slug, content, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, title, slug, content, description, now, now).run();

    return { id, title, slug, content, description, createdAt: now, updatedAt: now };
  }

  describe('getPost', () => {
    it('should return null for non-existent post', async () => {
      const post = await getPost(env.DB, 'non-existent-id');
      expect(post).toBeNull();
    });

    it('should return post by ID', async () => {
      const inserted = await insertPost({ title: 'My Post', slug: 'my-post' });

      const retrieved = await getPost(env.DB, inserted.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(inserted.id);
      expect(retrieved!.title).toBe('My Post');
      expect(retrieved!.slug).toBe('my-post');
      expect(retrieved!.content).toBe('Test content');
    });
  });

  describe('getPostBySlug', () => {
    it('should return null for non-existent slug', async () => {
      const post = await getPostBySlug(env.DB, 'non-existent-slug');
      expect(post).toBeNull();
    });

    it('should return post by slug', async () => {
      await insertPost({ title: 'Slug Post', slug: 'my-unique-slug' });

      const retrieved = await getPostBySlug(env.DB, 'my-unique-slug');
      expect(retrieved).not.toBeNull();
      expect(retrieved!.slug).toBe('my-unique-slug');
      expect(retrieved!.title).toBe('Slug Post');
    });
  });

  describe('listPosts', () => {
    it('should return empty array when no posts exist', async () => {
      const posts = await listPosts(env.DB);
      expect(posts).toEqual([]);
    });

    it('should return all posts sorted by publishedAt DESC without content', async () => {
      await insertPost({ title: 'Post 1', slug: 'post-1', publishedAt: '2024-01-01T00:00:00.000Z' });
      await insertPost({ title: 'Post 3', slug: 'post-3', publishedAt: '2024-03-01T00:00:00.000Z' });
      await insertPost({ title: 'Post 2', slug: 'post-2', publishedAt: '2024-02-01T00:00:00.000Z' });

      const posts = await listPosts(env.DB);
      expect(posts).toHaveLength(3);
      expect(posts[0].title).toBe('Post 3');
      expect(posts[1].title).toBe('Post 2');
      expect(posts[2].title).toBe('Post 1');

      // Content should not be present in summary listing
      expect((posts[0] as Record<string, unknown>).content).toBeUndefined();
    });
  });

  describe('updatePost', () => {
    it('should return null for non-existent post', async () => {
      const result = await updatePost(env.DB, 'non-existent', { title: 'New Title' });
      expect(result).toBeNull();
    });

    it('should update post fields', async () => {
      const inserted = await insertPost({ title: 'Original Title', slug: 'original-slug', content: 'Original content' });

      const updated = await updatePost(env.DB, inserted.id, {
        title: 'Updated Title',
        content: 'Updated content',
      });

      expect(updated).not.toBeNull();
      expect(updated!.title).toBe('Updated Title');
      expect(updated!.content).toBe('Updated content');
      expect(updated!.slug).toBe('original-slug');
    });

    it('should update slug successfully', async () => {
      const inserted = await insertPost({ title: 'Post', slug: 'old-slug' });

      await updatePost(env.DB, inserted.id, { slug: 'new-slug' });

      const byOldSlug = await getPostBySlug(env.DB, 'old-slug');
      expect(byOldSlug).toBeNull();

      const byNewSlug = await getPostBySlug(env.DB, 'new-slug');
      expect(byNewSlug).not.toBeNull();
      expect(byNewSlug!.id).toBe(inserted.id);
    });

    it('should throw on duplicate slug', async () => {
      await insertPost({ title: 'Post 1', slug: 'slug-1' });
      const post2 = await insertPost({ title: 'Post 2', slug: 'slug-2' });

      await expect(updatePost(env.DB, post2.id, { slug: 'slug-1' })).rejects.toThrow(
        'Slug "slug-1" is already in use'
      );
    });

    it('should allow updating to same slug', async () => {
      const inserted = await insertPost({ title: 'Post', slug: 'same-slug' });

      const updated = await updatePost(env.DB, inserted.id, { slug: 'same-slug' });
      expect(updated!.slug).toBe('same-slug');
    });

    it('should update publishedAt when provided', async () => {
      const inserted = await insertPost({ title: 'Post', slug: 'slug-date' });

      const newDate = '2020-01-15T12:00:00.000Z';
      const updated = await updatePost(env.DB, inserted.id, { publishedAt: newDate });

      expect(updated).not.toBeNull();
      expect(updated!.publishedAt).toBe(newDate);
    });

    it('should preserve publishedAt when not provided in update', async () => {
      const inserted = await insertPost({ title: 'Post', slug: 'slug-preserve', publishedAt: '2024-06-01T00:00:00.000Z' });

      const updated = await updatePost(env.DB, inserted.id, { title: 'New Title' });

      expect(updated!.publishedAt).toBe('2024-06-01T00:00:00.000Z');
    });

    it('should update updatedAt timestamp', async () => {
      const inserted = await insertPost({ title: 'Post', slug: 'slug' });

      await new Promise((r) => setTimeout(r, 10));

      const updated = await updatePost(env.DB, inserted.id, { title: 'New Title' });
      expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThan(
        new Date(inserted.updatedAt).getTime()
      );
    });
  });

  describe('deletePost', () => {
    it('should return false for non-existent post', async () => {
      const result = await deletePost(env.DB, 'non-existent');
      expect(result).toBe(false);
    });

    it('should delete post and return true', async () => {
      const inserted = await insertPost({ title: 'Post', slug: 'slug' });

      const result = await deletePost(env.DB, inserted.id);
      expect(result).toBe(true);

      const retrieved = await getPost(env.DB, inserted.id);
      expect(retrieved).toBeNull();
    });

    it('should free up slug after deletion', async () => {
      const inserted = await insertPost({ title: 'Post', slug: 'my-slug' });

      await deletePost(env.DB, inserted.id);

      const bySlug = await getPostBySlug(env.DB, 'my-slug');
      expect(bySlug).toBeNull();
    });

    it('should not affect other posts', async () => {
      const post1 = await insertPost({ title: 'Post 1', slug: 'slug-1' });
      await insertPost({ title: 'Post 2', slug: 'slug-2' });

      await deletePost(env.DB, post1.id);

      const posts = await listPosts(env.DB);
      expect(posts).toHaveLength(1);
      expect(posts[0].title).toBe('Post 2');
    });
  });

  describe('publishDraft', () => {
    it('should throw for non-existent draft', async () => {
      await expect(publishDraft(env.DB, 'non-existent')).rejects.toThrow('Draft not found');
    });

    it('should create post from draft', async () => {
      const draft = await insertDraft({ title: 'Draft Title', slug: 'draft-slug', content: 'Draft content' });

      const post = await publishDraft(env.DB, draft.id);

      expect(post.id).toBeDefined();
      expect(post.title).toBe('Draft Title');
      expect(post.slug).toBe('draft-slug');
      expect(post.content).toBe('Draft content');
      expect(post.publishedAt).toBeDefined();
      expect(post.updatedAt).toBeDefined();
    });

    it('should delete the draft after publishing', async () => {
      const draft = await insertDraft({ title: 'Draft', slug: 'slug', content: 'Content' });

      await publishDraft(env.DB, draft.id);

      // Verify draft is gone
      const result = await env.DB.prepare('SELECT id FROM drafts WHERE id = ?').bind(draft.id).first();
      expect(result).toBeNull();
    });

    it('should make post findable by slug', async () => {
      const draft = await insertDraft({ title: 'Draft', slug: 'my-slug', content: 'Content' });

      await publishDraft(env.DB, draft.id);

      const bySlug = await getPostBySlug(env.DB, 'my-slug');
      expect(bySlug).not.toBeNull();
    });

    it('should add post to listing', async () => {
      const draft = await insertDraft({ title: 'Draft', slug: 'slug', content: 'Content' });

      await publishDraft(env.DB, draft.id);

      const posts = await listPosts(env.DB);
      expect(posts).toHaveLength(1);
    });

    it('should throw if slug is already taken by existing post', async () => {
      await insertPost({ title: 'Existing Post', slug: 'same-slug' });
      const draft = await insertDraft({ title: 'Draft', slug: 'same-slug', content: 'Content' });

      await expect(publishDraft(env.DB, draft.id)).rejects.toThrow(
        'Slug "same-slug" is already in use'
      );
    });

    it('should preserve draft description', async () => {
      const draft = await insertDraft({ title: 'Draft', slug: 'desc-slug', content: 'Content', description: 'A description' });

      const post = await publishDraft(env.DB, draft.id);

      expect(post.description).toBe('A description');
    });
  });

  describe('unpublishPost', () => {
    it('should throw for non-existent post', async () => {
      await expect(unpublishPost(env.DB, 'non-existent')).rejects.toThrow('Post not found');
    });

    it('should create draft from post', async () => {
      const post = await insertPost({ title: 'Post Title', slug: 'post-slug', content: 'Post content' });

      const draft = await unpublishPost(env.DB, post.id);

      expect(draft.id).toBeDefined();
      expect(draft.title).toBe('Post Title');
      expect(draft.slug).toBe('post-slug');
      expect(draft.content).toBe('Post content');
      expect(draft.createdAt).toBeDefined();
      expect(draft.updatedAt).toBeDefined();
    });

    it('should delete the post after unpublishing', async () => {
      const post = await insertPost({ title: 'Post', slug: 'slug', content: 'Content' });

      await unpublishPost(env.DB, post.id);

      const deletedPost = await getPost(env.DB, post.id);
      expect(deletedPost).toBeNull();
    });

    it('should create a draft row in D1', async () => {
      const post = await insertPost({ title: 'Post', slug: 'slug', content: 'Content' });

      const draft = await unpublishPost(env.DB, post.id);

      // Verify the draft exists in D1
      const row = await env.DB.prepare('SELECT id, title FROM drafts WHERE id = ?').bind(draft.id).first<{ id: string; title: string }>();
      expect(row).not.toBeNull();
      expect(row!.title).toBe('Post');
    });

    it('should free up the slug for new posts', async () => {
      const post = await insertPost({ title: 'Post 1', slug: 'shared-slug', content: 'Content 1' });

      await unpublishPost(env.DB, post.id);

      const bySlug = await getPostBySlug(env.DB, 'shared-slug');
      expect(bySlug).toBeNull();

      // Should be able to insert a new post with the same slug
      await insertPost({ title: 'Post 2', slug: 'shared-slug', content: 'Content 2' });
      const post2 = await getPostBySlug(env.DB, 'shared-slug');
      expect(post2).not.toBeNull();
      expect(post2!.title).toBe('Post 2');
    });

    it('should remove post from listing', async () => {
      const post = await insertPost({ title: 'Post', slug: 'slug', content: 'Content' });

      await unpublishPost(env.DB, post.id);

      const posts = await listPosts(env.DB);
      expect(posts).toHaveLength(0);
    });
  });
});
