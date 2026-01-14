/**
 * Draft DAO Tests
 *
 * Comprehensive tests for draft CRUD operations and sharing functionality.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import {
  getDraft,
  listDrafts,
  createDraft,
  updateDraft,
  deleteDraft,
  createShareToken,
  getDraftByShareToken,
  revokeShareToken,
} from '../../dao/draft.dao';
import { KV_PREFIX } from '../../types';

describe('Draft DAO', () => {
  beforeEach(async () => {
    // Clean up all draft-related keys before each test
    const keys = await env.KV.list({ prefix: KV_PREFIX.DRAFT });
    for (const key of keys.keys) {
      await env.KV.delete(key.name);
    }
    const shareKeys = await env.KV.list({ prefix: KV_PREFIX.SHARE });
    for (const key of shareKeys.keys) {
      await env.KV.delete(key.name);
    }
    await env.KV.delete(KV_PREFIX.INDEX_DRAFTS);
  });

  describe('createDraft', () => {
    it('should create a draft with generated ID and timestamps', async () => {
      const draft = await createDraft(env.KV, {
        title: 'Test Draft',
        slug: 'test-draft',
        content: 'This is test content',
      });

      expect(draft.id).toBeDefined();
      expect(draft.title).toBe('Test Draft');
      expect(draft.slug).toBe('test-draft');
      expect(draft.content).toBe('This is test content');
      expect(draft.createdAt).toBeDefined();
      expect(draft.updatedAt).toBeDefined();
      expect(new Date(draft.createdAt).getTime()).toBeGreaterThan(0);
    });

    it('should add draft ID to index', async () => {
      const draft = await createDraft(env.KV, {
        title: 'Test Draft',
        slug: 'test-draft',
        content: 'Content',
      });

      const indexData = await env.KV.get(KV_PREFIX.INDEX_DRAFTS);
      const index = JSON.parse(indexData!);
      expect(index).toContain(draft.id);
    });

    it('should store draft in KV', async () => {
      const draft = await createDraft(env.KV, {
        title: 'Test Draft',
        slug: 'test-draft',
        content: 'Content',
      });

      const stored = await env.KV.get(`${KV_PREFIX.DRAFT}${draft.id}`);
      expect(stored).toBeDefined();
      const parsed = JSON.parse(stored!);
      expect(parsed.title).toBe('Test Draft');
    });
  });

  describe('getDraft', () => {
    it('should return null for non-existent draft', async () => {
      const draft = await getDraft(env.KV, 'non-existent-id');
      expect(draft).toBeNull();
    });

    it('should return draft by ID', async () => {
      const created = await createDraft(env.KV, {
        title: 'Test Draft',
        slug: 'test-draft',
        content: 'Content',
      });

      const retrieved = await getDraft(env.KV, created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.title).toBe('Test Draft');
    });
  });

  describe('listDrafts', () => {
    it('should return empty array when no drafts exist', async () => {
      const drafts = await listDrafts(env.KV);
      expect(drafts).toEqual([]);
    });

    it('should return all drafts in order (newest first)', async () => {
      await createDraft(env.KV, { title: 'Draft 1', slug: 'draft-1', content: 'Content 1' });
      await createDraft(env.KV, { title: 'Draft 2', slug: 'draft-2', content: 'Content 2' });
      await createDraft(env.KV, { title: 'Draft 3', slug: 'draft-3', content: 'Content 3' });

      const drafts = await listDrafts(env.KV);
      expect(drafts).toHaveLength(3);
      expect(drafts[0].title).toBe('Draft 3');
      expect(drafts[1].title).toBe('Draft 2');
      expect(drafts[2].title).toBe('Draft 1');
    });
  });

  describe('updateDraft', () => {
    it('should return null for non-existent draft', async () => {
      const result = await updateDraft(env.KV, 'non-existent', { title: 'New Title' });
      expect(result).toBeNull();
    });

    it('should update draft fields', async () => {
      const created = await createDraft(env.KV, {
        title: 'Original Title',
        slug: 'original-slug',
        content: 'Original content',
      });

      const updated = await updateDraft(env.KV, created.id, {
        title: 'Updated Title',
        content: 'Updated content',
      });

      expect(updated).not.toBeNull();
      expect(updated!.title).toBe('Updated Title');
      expect(updated!.content).toBe('Updated content');
      expect(updated!.slug).toBe('original-slug'); // Unchanged
    });

    it('should update updatedAt timestamp', async () => {
      const created = await createDraft(env.KV, {
        title: 'Draft',
        slug: 'draft',
        content: 'Content',
      });

      const originalUpdatedAt = created.updatedAt;

      // Small delay to ensure different timestamp
      await new Promise((r) => setTimeout(r, 10));

      const updated = await updateDraft(env.KV, created.id, { title: 'New Title' });
      expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      );
    });

    it('should preserve fields not in update', async () => {
      const created = await createDraft(env.KV, {
        title: 'Title',
        slug: 'slug',
        content: 'Content',
      });

      const updated = await updateDraft(env.KV, created.id, { title: 'New Title' });
      expect(updated!.slug).toBe('slug');
      expect(updated!.content).toBe('Content');
      expect(updated!.createdAt).toBe(created.createdAt);
    });
  });

  describe('deleteDraft', () => {
    it('should return false for non-existent draft', async () => {
      const result = await deleteDraft(env.KV, 'non-existent');
      expect(result).toBe(false);
    });

    it('should delete draft from KV', async () => {
      const created = await createDraft(env.KV, {
        title: 'Draft',
        slug: 'draft',
        content: 'Content',
      });

      const result = await deleteDraft(env.KV, created.id);
      expect(result).toBe(true);

      const retrieved = await getDraft(env.KV, created.id);
      expect(retrieved).toBeNull();
    });

    it('should remove draft from index', async () => {
      const created = await createDraft(env.KV, {
        title: 'Draft',
        slug: 'draft',
        content: 'Content',
      });

      await deleteDraft(env.KV, created.id);

      const indexData = await env.KV.get(KV_PREFIX.INDEX_DRAFTS);
      const index = JSON.parse(indexData!);
      expect(index).not.toContain(created.id);
    });

    it('should delete share token when draft is deleted', async () => {
      const created = await createDraft(env.KV, {
        title: 'Draft',
        slug: 'draft',
        content: 'Content',
      });

      const token = await createShareToken(env.KV, created.id);
      await deleteDraft(env.KV, created.id);

      const shareData = await env.KV.get(`${KV_PREFIX.SHARE}${token}`);
      expect(shareData).toBeNull();
    });
  });

  describe('createShareToken', () => {
    it('should throw for non-existent draft', async () => {
      await expect(createShareToken(env.KV, 'non-existent')).rejects.toThrow('Draft not found');
    });

    it('should create share token and update draft', async () => {
      const created = await createDraft(env.KV, {
        title: 'Draft',
        slug: 'draft',
        content: 'Content',
      });

      const token = await createShareToken(env.KV, created.id);
      expect(token).toBeDefined();
      expect(token.length).toBeGreaterThan(0);

      const updated = await getDraft(env.KV, created.id);
      expect(updated!.shareToken).toBe(token);
    });

    it('should create share token lookup in KV', async () => {
      const created = await createDraft(env.KV, {
        title: 'Draft',
        slug: 'draft',
        content: 'Content',
      });

      const token = await createShareToken(env.KV, created.id);
      const draftId = await env.KV.get(`${KV_PREFIX.SHARE}${token}`);
      expect(draftId).toBe(created.id);
    });

    it('should replace old share token when creating new one', async () => {
      const created = await createDraft(env.KV, {
        title: 'Draft',
        slug: 'draft',
        content: 'Content',
      });

      const oldToken = await createShareToken(env.KV, created.id);
      const newToken = await createShareToken(env.KV, created.id);

      expect(newToken).not.toBe(oldToken);

      // Old token should be deleted
      const oldLookup = await env.KV.get(`${KV_PREFIX.SHARE}${oldToken}`);
      expect(oldLookup).toBeNull();

      // New token should work
      const newLookup = await env.KV.get(`${KV_PREFIX.SHARE}${newToken}`);
      expect(newLookup).toBe(created.id);
    });
  });

  describe('getDraftByShareToken', () => {
    it('should return null for non-existent token', async () => {
      const draft = await getDraftByShareToken(env.KV, 'non-existent');
      expect(draft).toBeNull();
    });

    it('should return draft by share token', async () => {
      const created = await createDraft(env.KV, {
        title: 'Shared Draft',
        slug: 'shared-draft',
        content: 'Shared content',
      });

      const token = await createShareToken(env.KV, created.id);
      const retrieved = await getDraftByShareToken(env.KV, token);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.title).toBe('Shared Draft');
    });
  });

  describe('revokeShareToken', () => {
    it('should do nothing for draft without share token', async () => {
      const created = await createDraft(env.KV, {
        title: 'Draft',
        slug: 'draft',
        content: 'Content',
      });

      // Should not throw
      await revokeShareToken(env.KV, created.id);
    });

    it('should remove share token from draft', async () => {
      const created = await createDraft(env.KV, {
        title: 'Draft',
        slug: 'draft',
        content: 'Content',
      });

      await createShareToken(env.KV, created.id);
      await revokeShareToken(env.KV, created.id);

      const updated = await getDraft(env.KV, created.id);
      expect(updated!.shareToken).toBeUndefined();
    });

    it('should delete share token lookup', async () => {
      const created = await createDraft(env.KV, {
        title: 'Draft',
        slug: 'draft',
        content: 'Content',
      });

      const token = await createShareToken(env.KV, created.id);
      await revokeShareToken(env.KV, created.id);

      const lookup = await env.KV.get(`${KV_PREFIX.SHARE}${token}`);
      expect(lookup).toBeNull();
    });

    it('should make share token unusable', async () => {
      const created = await createDraft(env.KV, {
        title: 'Draft',
        slug: 'draft',
        content: 'Content',
      });

      const token = await createShareToken(env.KV, created.id);
      await revokeShareToken(env.KV, created.id);

      const retrieved = await getDraftByShareToken(env.KV, token);
      expect(retrieved).toBeNull();
    });
  });
});
