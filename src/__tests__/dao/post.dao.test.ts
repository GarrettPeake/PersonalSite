/**
 * Post DAO Tests
 *
 * Comprehensive tests for post CRUD operations and publish/unpublish functionality.
 */

import { describe, it, expect, beforeEach } from 'vitest';
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
import { createDraft, getDraft, listDrafts } from '../../dao/draft.dao';
import { KV_PREFIX } from '../../types';

describe('Post DAO', () => {
  beforeEach(async () => {
    // Clean up all post and draft related keys
    const postKeys = await env.KV.list({ prefix: KV_PREFIX.POST });
    for (const key of postKeys.keys) {
      await env.KV.delete(key.name);
    }
    const slugKeys = await env.KV.list({ prefix: KV_PREFIX.POST_SLUG });
    for (const key of slugKeys.keys) {
      await env.KV.delete(key.name);
    }
    const draftKeys = await env.KV.list({ prefix: KV_PREFIX.DRAFT });
    for (const key of draftKeys.keys) {
      await env.KV.delete(key.name);
    }
    await env.KV.delete(KV_PREFIX.INDEX_POSTS);
    await env.KV.delete(KV_PREFIX.INDEX_DRAFTS);
  });

  describe('getPost', () => {
    it('should return null for non-existent post', async () => {
      const post = await getPost(env.KV, 'non-existent-id');
      expect(post).toBeNull();
    });

    it('should return post by ID', async () => {
      const draft = await createDraft(env.KV, {
        title: 'Test Post',
        slug: 'test-post',
        content: 'Content',
      });
      const post = await publishDraft(env.KV, draft.id);

      const retrieved = await getPost(env.KV, post.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(post.id);
      expect(retrieved!.title).toBe('Test Post');
    });
  });

  describe('getPostBySlug', () => {
    it('should return null for non-existent slug', async () => {
      const post = await getPostBySlug(env.KV, 'non-existent-slug');
      expect(post).toBeNull();
    });

    it('should return post by slug', async () => {
      const draft = await createDraft(env.KV, {
        title: 'Test Post',
        slug: 'my-unique-slug',
        content: 'Content',
      });
      await publishDraft(env.KV, draft.id);

      const retrieved = await getPostBySlug(env.KV, 'my-unique-slug');
      expect(retrieved).not.toBeNull();
      expect(retrieved!.slug).toBe('my-unique-slug');
      expect(retrieved!.title).toBe('Test Post');
    });
  });

  describe('listPosts', () => {
    it('should return empty array when no posts exist', async () => {
      const posts = await listPosts(env.KV);
      expect(posts).toEqual([]);
    });

    it('should return all posts in order (newest first)', async () => {
      const draft1 = await createDraft(env.KV, {
        title: 'Post 1',
        slug: 'post-1',
        content: 'Content 1',
      });
      const draft2 = await createDraft(env.KV, {
        title: 'Post 2',
        slug: 'post-2',
        content: 'Content 2',
      });
      const draft3 = await createDraft(env.KV, {
        title: 'Post 3',
        slug: 'post-3',
        content: 'Content 3',
      });

      await publishDraft(env.KV, draft1.id);
      await publishDraft(env.KV, draft2.id);
      await publishDraft(env.KV, draft3.id);

      const posts = await listPosts(env.KV);
      expect(posts).toHaveLength(3);
      expect(posts[0].title).toBe('Post 3');
      expect(posts[1].title).toBe('Post 2');
      expect(posts[2].title).toBe('Post 1');
    });
  });

  describe('updatePost', () => {
    it('should return null for non-existent post', async () => {
      const result = await updatePost(env.KV, 'non-existent', { title: 'New Title' });
      expect(result).toBeNull();
    });

    it('should update post fields', async () => {
      const draft = await createDraft(env.KV, {
        title: 'Original Title',
        slug: 'original-slug',
        content: 'Original content',
      });
      const post = await publishDraft(env.KV, draft.id);

      const updated = await updatePost(env.KV, post.id, {
        title: 'Updated Title',
        content: 'Updated content',
      });

      expect(updated).not.toBeNull();
      expect(updated!.title).toBe('Updated Title');
      expect(updated!.content).toBe('Updated content');
      expect(updated!.slug).toBe('original-slug'); // Unchanged
    });

    it('should update slug and slug lookup', async () => {
      const draft = await createDraft(env.KV, {
        title: 'Post',
        slug: 'old-slug',
        content: 'Content',
      });
      const post = await publishDraft(env.KV, draft.id);

      await updatePost(env.KV, post.id, { slug: 'new-slug' });

      // Old slug should not work
      const byOldSlug = await getPostBySlug(env.KV, 'old-slug');
      expect(byOldSlug).toBeNull();

      // New slug should work
      const byNewSlug = await getPostBySlug(env.KV, 'new-slug');
      expect(byNewSlug).not.toBeNull();
      expect(byNewSlug!.id).toBe(post.id);
    });

    it('should throw if new slug is already taken by another post', async () => {
      const draft1 = await createDraft(env.KV, {
        title: 'Post 1',
        slug: 'slug-1',
        content: 'Content 1',
      });
      const draft2 = await createDraft(env.KV, {
        title: 'Post 2',
        slug: 'slug-2',
        content: 'Content 2',
      });

      await publishDraft(env.KV, draft1.id);
      const post2 = await publishDraft(env.KV, draft2.id);

      await expect(updatePost(env.KV, post2.id, { slug: 'slug-1' })).rejects.toThrow(
        'Slug "slug-1" is already in use'
      );
    });

    it('should allow updating to same slug', async () => {
      const draft = await createDraft(env.KV, {
        title: 'Post',
        slug: 'same-slug',
        content: 'Content',
      });
      const post = await publishDraft(env.KV, draft.id);

      const updated = await updatePost(env.KV, post.id, { slug: 'same-slug' });
      expect(updated!.slug).toBe('same-slug');
    });

    it('should update updatedAt timestamp', async () => {
      const draft = await createDraft(env.KV, {
        title: 'Post',
        slug: 'slug',
        content: 'Content',
      });
      const post = await publishDraft(env.KV, draft.id);
      const originalUpdatedAt = post.updatedAt;

      await new Promise((r) => setTimeout(r, 10));

      const updated = await updatePost(env.KV, post.id, { title: 'New Title' });
      expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      );
    });
  });

  describe('deletePost', () => {
    it('should return false for non-existent post', async () => {
      const result = await deletePost(env.KV, 'non-existent');
      expect(result).toBe(false);
    });

    it('should delete post from KV', async () => {
      const draft = await createDraft(env.KV, {
        title: 'Post',
        slug: 'slug',
        content: 'Content',
      });
      const post = await publishDraft(env.KV, draft.id);

      const result = await deletePost(env.KV, post.id);
      expect(result).toBe(true);

      const retrieved = await getPost(env.KV, post.id);
      expect(retrieved).toBeNull();
    });

    it('should delete slug lookup', async () => {
      const draft = await createDraft(env.KV, {
        title: 'Post',
        slug: 'my-slug',
        content: 'Content',
      });
      const post = await publishDraft(env.KV, draft.id);

      await deletePost(env.KV, post.id);

      const bySlug = await getPostBySlug(env.KV, 'my-slug');
      expect(bySlug).toBeNull();
    });

    it('should remove post from index', async () => {
      const draft = await createDraft(env.KV, {
        title: 'Post',
        slug: 'slug',
        content: 'Content',
      });
      const post = await publishDraft(env.KV, draft.id);

      await deletePost(env.KV, post.id);

      const posts = await listPosts(env.KV);
      expect(posts).toHaveLength(0);
    });
  });

  describe('publishDraft', () => {
    it('should throw for non-existent draft', async () => {
      await expect(publishDraft(env.KV, 'non-existent')).rejects.toThrow('Draft not found');
    });

    it('should create post from draft', async () => {
      const draft = await createDraft(env.KV, {
        title: 'Draft Title',
        slug: 'draft-slug',
        content: 'Draft content',
      });

      const post = await publishDraft(env.KV, draft.id);

      expect(post.id).toBeDefined();
      expect(post.title).toBe('Draft Title');
      expect(post.slug).toBe('draft-slug');
      expect(post.content).toBe('Draft content');
      expect(post.publishedAt).toBeDefined();
      expect(post.updatedAt).toBeDefined();
    });

    it('should delete the draft after publishing', async () => {
      const draft = await createDraft(env.KV, {
        title: 'Draft',
        slug: 'slug',
        content: 'Content',
      });

      await publishDraft(env.KV, draft.id);

      const deletedDraft = await getDraft(env.KV, draft.id);
      expect(deletedDraft).toBeNull();
    });

    it('should add post to index', async () => {
      const draft = await createDraft(env.KV, {
        title: 'Draft',
        slug: 'slug',
        content: 'Content',
      });

      await publishDraft(env.KV, draft.id);

      const posts = await listPosts(env.KV);
      expect(posts).toHaveLength(1);
    });

    it('should create slug lookup', async () => {
      const draft = await createDraft(env.KV, {
        title: 'Draft',
        slug: 'my-slug',
        content: 'Content',
      });

      await publishDraft(env.KV, draft.id);

      const bySlug = await getPostBySlug(env.KV, 'my-slug');
      expect(bySlug).not.toBeNull();
    });

    it('should throw if slug is already taken', async () => {
      const draft1 = await createDraft(env.KV, {
        title: 'Draft 1',
        slug: 'same-slug',
        content: 'Content 1',
      });
      const draft2 = await createDraft(env.KV, {
        title: 'Draft 2',
        slug: 'same-slug',
        content: 'Content 2',
      });

      await publishDraft(env.KV, draft1.id);
      await expect(publishDraft(env.KV, draft2.id)).rejects.toThrow(
        'Slug "same-slug" is already in use'
      );
    });
  });

  describe('unpublishPost', () => {
    it('should throw for non-existent post', async () => {
      await expect(unpublishPost(env.KV, 'non-existent')).rejects.toThrow('Post not found');
    });

    it('should create draft from post', async () => {
      const draft = await createDraft(env.KV, {
        title: 'Post Title',
        slug: 'post-slug',
        content: 'Post content',
      });
      const post = await publishDraft(env.KV, draft.id);

      const newDraft = await unpublishPost(env.KV, post.id);

      expect(newDraft.id).toBeDefined();
      expect(newDraft.title).toBe('Post Title');
      expect(newDraft.slug).toBe('post-slug');
      expect(newDraft.content).toBe('Post content');
    });

    it('should delete the post after unpublishing', async () => {
      const draft = await createDraft(env.KV, {
        title: 'Post',
        slug: 'slug',
        content: 'Content',
      });
      const post = await publishDraft(env.KV, draft.id);

      await unpublishPost(env.KV, post.id);

      const deletedPost = await getPost(env.KV, post.id);
      expect(deletedPost).toBeNull();
    });

    it('should add draft to index', async () => {
      const draft = await createDraft(env.KV, {
        title: 'Post',
        slug: 'slug',
        content: 'Content',
      });
      const post = await publishDraft(env.KV, draft.id);

      await unpublishPost(env.KV, post.id);

      const drafts = await listDrafts(env.KV);
      expect(drafts).toHaveLength(1);
    });

    it('should remove post from index', async () => {
      const draft = await createDraft(env.KV, {
        title: 'Post',
        slug: 'slug',
        content: 'Content',
      });
      const post = await publishDraft(env.KV, draft.id);

      await unpublishPost(env.KV, post.id);

      const posts = await listPosts(env.KV);
      expect(posts).toHaveLength(0);
    });

    it('should free up the slug for new posts', async () => {
      const draft1 = await createDraft(env.KV, {
        title: 'Post 1',
        slug: 'shared-slug',
        content: 'Content 1',
      });
      const post = await publishDraft(env.KV, draft1.id);
      await unpublishPost(env.KV, post.id);

      // Now we should be able to publish another draft with the same slug
      const draft2 = await createDraft(env.KV, {
        title: 'Post 2',
        slug: 'shared-slug',
        content: 'Content 2',
      });
      const post2 = await publishDraft(env.KV, draft2.id);
      expect(post2.slug).toBe('shared-slug');
    });
  });
});
