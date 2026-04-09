/**
 * Draft DAO Tests
 *
 * Tests for draft CRUD operations and sharing functionality against D1.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
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

describe('Draft DAO', () => {
  beforeAll(async () => {
    await env.DB.exec(
      "CREATE TABLE IF NOT EXISTS drafts (id TEXT PRIMARY KEY, title TEXT NOT NULL DEFAULT '', slug TEXT NOT NULL DEFAULT '', content TEXT NOT NULL DEFAULT '', description TEXT, share_token TEXT UNIQUE, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"
    );
    await env.DB.exec("CREATE INDEX IF NOT EXISTS idx_drafts_updated_at ON drafts(updated_at DESC)");
    await env.DB.exec("CREATE INDEX IF NOT EXISTS idx_drafts_share_token ON drafts(share_token)");
  });

  beforeEach(async () => {
    await env.DB.exec('DELETE FROM drafts');
  });

  describe('createDraft', () => {
    it('should create a draft with generated ID and timestamps', async () => {
      const draft = await createDraft(env.DB, {
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

    it('should store draft in D1', async () => {
      const draft = await createDraft(env.DB, {
        title: 'Test Draft',
        slug: 'test-draft',
        content: 'Content',
      });

      const stored = await getDraft(env.DB, draft.id);
      expect(stored).not.toBeNull();
      expect(stored!.title).toBe('Test Draft');
    });

    it('should handle optional description', async () => {
      const draft = await createDraft(env.DB, {
        title: 'Draft with desc',
        slug: 'draft-desc',
        content: 'Content',
        description: 'A description',
      });

      expect(draft.description).toBe('A description');
      const stored = await getDraft(env.DB, draft.id);
      expect(stored!.description).toBe('A description');
    });

    it('should handle optional shareToken', async () => {
      const draft = await createDraft(env.DB, {
        title: 'Draft with token',
        slug: 'draft-token',
        content: 'Content',
        shareToken: 'pre-set-token',
      });

      expect(draft.shareToken).toBe('pre-set-token');
      const stored = await getDraft(env.DB, draft.id);
      expect(stored!.shareToken).toBe('pre-set-token');
    });
  });

  describe('getDraft', () => {
    it('should return null for non-existent draft', async () => {
      const draft = await getDraft(env.DB, 'non-existent-id');
      expect(draft).toBeNull();
    });

    it('should return draft by ID', async () => {
      const created = await createDraft(env.DB, {
        title: 'Test Draft',
        slug: 'test-draft',
        content: 'Content',
      });

      const retrieved = await getDraft(env.DB, created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.title).toBe('Test Draft');
    });
  });

  describe('listDrafts', () => {
    it('should return empty array when no drafts exist', async () => {
      const drafts = await listDrafts(env.DB);
      expect(drafts).toEqual([]);
    });

    it('should return all drafts ordered by updatedAt DESC', async () => {
      // Insert with explicit timestamps to control order
      await env.DB.prepare(
        'INSERT INTO drafts (id, title, slug, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind('d1', 'Draft 1', 'draft-1', 'Content 1', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z').run();

      await env.DB.prepare(
        'INSERT INTO drafts (id, title, slug, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind('d2', 'Draft 2', 'draft-2', 'Content 2', '2024-01-02T00:00:00Z', '2024-01-03T00:00:00Z').run();

      await env.DB.prepare(
        'INSERT INTO drafts (id, title, slug, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind('d3', 'Draft 3', 'draft-3', 'Content 3', '2024-01-03T00:00:00Z', '2024-01-02T00:00:00Z').run();

      const drafts = await listDrafts(env.DB);
      expect(drafts).toHaveLength(3);
      // Ordered by updated_at DESC: d2 (Jan 3), d3 (Jan 2), d1 (Jan 1)
      expect(drafts[0].title).toBe('Draft 2');
      expect(drafts[1].title).toBe('Draft 3');
      expect(drafts[2].title).toBe('Draft 1');
    });

    it('should not include content field in summaries', async () => {
      await createDraft(env.DB, {
        title: 'Draft',
        slug: 'draft',
        content: 'Some long content here',
      });

      const drafts = await listDrafts(env.DB);
      expect(drafts).toHaveLength(1);
      expect(drafts[0].title).toBe('Draft');
      // content should not be present in the summary
      expect((drafts[0] as Record<string, unknown>).content).toBeUndefined();
    });
  });

  describe('updateDraft', () => {
    it('should return null for non-existent draft', async () => {
      const result = await updateDraft(env.DB, 'non-existent', { title: 'New Title' });
      expect(result).toBeNull();
    });

    it('should update draft fields', async () => {
      const created = await createDraft(env.DB, {
        title: 'Original Title',
        slug: 'original-slug',
        content: 'Original content',
      });

      const updated = await updateDraft(env.DB, created.id, {
        title: 'Updated Title',
        content: 'Updated content',
      });

      expect(updated).not.toBeNull();
      expect(updated!.title).toBe('Updated Title');
      expect(updated!.content).toBe('Updated content');
      expect(updated!.slug).toBe('original-slug'); // Unchanged
    });

    it('should update updatedAt timestamp', async () => {
      const created = await createDraft(env.DB, {
        title: 'Draft',
        slug: 'draft',
        content: 'Content',
      });

      const originalUpdatedAt = created.updatedAt;

      // Small delay to ensure different timestamp
      await new Promise((r) => setTimeout(r, 10));

      const updated = await updateDraft(env.DB, created.id, { title: 'New Title' });
      expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      );
    });

    it('should preserve fields not in update', async () => {
      const created = await createDraft(env.DB, {
        title: 'Title',
        slug: 'slug',
        content: 'Content',
      });

      const updated = await updateDraft(env.DB, created.id, { title: 'New Title' });
      expect(updated!.slug).toBe('slug');
      expect(updated!.content).toBe('Content');
      expect(updated!.createdAt).toBe(created.createdAt);
    });
  });

  describe('deleteDraft', () => {
    it('should return false for non-existent draft', async () => {
      const result = await deleteDraft(env.DB, 'non-existent');
      expect(result).toBe(false);
    });

    it('should delete draft from D1', async () => {
      const created = await createDraft(env.DB, {
        title: 'Draft',
        slug: 'draft',
        content: 'Content',
      });

      const result = await deleteDraft(env.DB, created.id);
      expect(result).toBe(true);

      const retrieved = await getDraft(env.DB, created.id);
      expect(retrieved).toBeNull();
    });

    it('should delete draft with share token', async () => {
      const created = await createDraft(env.DB, {
        title: 'Draft',
        slug: 'draft',
        content: 'Content',
      });

      const token = await createShareToken(env.DB, created.id);
      await deleteDraft(env.DB, created.id);

      // Share token should no longer resolve
      const byToken = await getDraftByShareToken(env.DB, token);
      expect(byToken).toBeNull();
    });
  });

  describe('createShareToken', () => {
    it('should throw for non-existent draft', async () => {
      await expect(createShareToken(env.DB, 'non-existent')).rejects.toThrow('Draft not found');
    });

    it('should create share token and update draft', async () => {
      const created = await createDraft(env.DB, {
        title: 'Draft',
        slug: 'draft',
        content: 'Content',
      });

      const token = await createShareToken(env.DB, created.id);
      expect(token).toBeDefined();
      expect(token.length).toBeGreaterThan(0);

      const updated = await getDraft(env.DB, created.id);
      expect(updated!.shareToken).toBe(token);
    });

    it('should replace old share token when creating new one', async () => {
      const created = await createDraft(env.DB, {
        title: 'Draft',
        slug: 'draft',
        content: 'Content',
      });

      const oldToken = await createShareToken(env.DB, created.id);
      const newToken = await createShareToken(env.DB, created.id);

      expect(newToken).not.toBe(oldToken);

      // Old token should no longer work
      const oldLookup = await getDraftByShareToken(env.DB, oldToken);
      expect(oldLookup).toBeNull();

      // New token should work
      const newLookup = await getDraftByShareToken(env.DB, newToken);
      expect(newLookup).not.toBeNull();
      expect(newLookup!.id).toBe(created.id);
    });
  });

  describe('getDraftByShareToken', () => {
    it('should return null for non-existent token', async () => {
      const draft = await getDraftByShareToken(env.DB, 'non-existent');
      expect(draft).toBeNull();
    });

    it('should return draft by share token', async () => {
      const created = await createDraft(env.DB, {
        title: 'Shared Draft',
        slug: 'shared-draft',
        content: 'Shared content',
      });

      const token = await createShareToken(env.DB, created.id);
      const retrieved = await getDraftByShareToken(env.DB, token);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.title).toBe('Shared Draft');
    });
  });

  describe('revokeShareToken', () => {
    it('should do nothing for draft without share token', async () => {
      const created = await createDraft(env.DB, {
        title: 'Draft',
        slug: 'draft',
        content: 'Content',
      });

      // Should not throw
      await revokeShareToken(env.DB, created.id);
    });

    it('should remove share token from draft', async () => {
      const created = await createDraft(env.DB, {
        title: 'Draft',
        slug: 'draft',
        content: 'Content',
      });

      await createShareToken(env.DB, created.id);
      await revokeShareToken(env.DB, created.id);

      const updated = await getDraft(env.DB, created.id);
      expect(updated!.shareToken).toBeNull();
    });

    it('should make share token unusable', async () => {
      const created = await createDraft(env.DB, {
        title: 'Draft',
        slug: 'draft',
        content: 'Content',
      });

      const token = await createShareToken(env.DB, created.id);
      await revokeShareToken(env.DB, created.id);

      const retrieved = await getDraftByShareToken(env.DB, token);
      expect(retrieved).toBeNull();
    });
  });
});
