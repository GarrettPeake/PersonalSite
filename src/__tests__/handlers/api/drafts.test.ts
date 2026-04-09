/**
 * Admin Drafts API Handlers Tests
 *
 * Tests for draft management endpoints against D1.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import {
  handleListDrafts,
  handleCreateDraft,
  handleGetDraft,
  handleUpdateDraft,
  handleDeleteDraft,
  handlePublishDraft,
  handleShareDraft,
  handleRevokeShareDraft,
  handleGetDraftByShareToken,
} from '../../../handlers/api/drafts';
import { createDraft, getDraft, getDraftByShareToken } from '../../../dao/draft.dao';

describe('Admin Drafts API Handlers', () => {
  beforeAll(async () => {
    await env.DB.exec(
      "CREATE TABLE IF NOT EXISTS drafts (id TEXT PRIMARY KEY, title TEXT NOT NULL DEFAULT '', slug TEXT NOT NULL DEFAULT '', content TEXT NOT NULL DEFAULT '', description TEXT, share_token TEXT UNIQUE, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"
    );
    await env.DB.exec("CREATE INDEX IF NOT EXISTS idx_drafts_updated_at ON drafts(updated_at DESC)");
    await env.DB.exec("CREATE INDEX IF NOT EXISTS idx_drafts_share_token ON drafts(share_token)");
    await env.DB.exec(
      "CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, title TEXT NOT NULL DEFAULT '', slug TEXT NOT NULL UNIQUE, content TEXT NOT NULL DEFAULT '', description TEXT, published_at TEXT NOT NULL, updated_at TEXT NOT NULL)"
    );
    await env.DB.exec("CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at DESC)");
  });

  beforeEach(async () => {
    await env.DB.exec('DELETE FROM drafts');
    await env.DB.exec('DELETE FROM posts');
  });

  describe('handleListDrafts', () => {
    it('should return empty array when no drafts exist', async () => {
      const response = await handleListDrafts(env);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual([]);
    });

    it('should return all drafts', async () => {
      await createDraft(env.DB, { title: 'Draft 1', slug: 'draft-1', content: 'Content 1' });
      await createDraft(env.DB, { title: 'Draft 2', slug: 'draft-2', content: 'Content 2' });

      const response = await handleListDrafts(env);

      expect(response.status).toBe(200);
      const data = await response.json() as Array<{ title: string }>;
      expect(data).toHaveLength(2);
    });

    it('should include CORS headers', async () => {
      const response = await handleListDrafts(env);
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    });
  });

  describe('handleCreateDraft', () => {
    it('should create a new draft', async () => {
      const request = new Request('http://localhost/api/admin/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Draft',
          slug: 'new-draft',
          content: 'Draft content',
        }),
      });

      const response = await handleCreateDraft(request, env);

      expect(response.status).toBe(200);
      const data = await response.json() as { id: string; title: string };
      expect(data.id).toBeDefined();
      expect(data.title).toBe('New Draft');
    });

    it('should persist draft in D1', async () => {
      const request = new Request('http://localhost/api/admin/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Persisted Draft',
          slug: 'persisted-draft',
          content: 'Content',
        }),
      });

      const response = await handleCreateDraft(request, env);
      const data = await response.json() as { id: string };

      const stored = await getDraft(env.DB, data.id);
      expect(stored).not.toBeNull();
      expect(stored!.title).toBe('Persisted Draft');
    });
  });

  describe('handleGetDraft', () => {
    it('should return 404 for non-existent draft', async () => {
      const response = await handleGetDraft(env, 'non-existent');

      expect(response.status).toBe(404);
      const data = await response.json() as { error: string };
      expect(data.error).toBe('Not found');
    });

    it('should return draft by ID', async () => {
      const draft = await createDraft(env.DB, {
        title: 'My Draft',
        slug: 'my-draft',
        content: 'Content',
      });

      const response = await handleGetDraft(env, draft.id);

      expect(response.status).toBe(200);
      const data = await response.json() as { id: string; title: string };
      expect(data.id).toBe(draft.id);
      expect(data.title).toBe('My Draft');
    });
  });

  describe('handleUpdateDraft', () => {
    it('should return 404 for non-existent draft', async () => {
      const request = new Request('http://localhost/api/admin/drafts/non-existent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Title' }),
      });

      const response = await handleUpdateDraft(request, env, 'non-existent');

      expect(response.status).toBe(404);
    });

    it('should update draft fields', async () => {
      const draft = await createDraft(env.DB, {
        title: 'Original',
        slug: 'original',
        content: 'Original content',
      });

      const request = new Request(`http://localhost/api/admin/drafts/${draft.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title' }),
      });

      const response = await handleUpdateDraft(request, env, draft.id);

      expect(response.status).toBe(200);
      const data = await response.json() as { title: string; slug: string };
      expect(data.title).toBe('Updated Title');
      expect(data.slug).toBe('original'); // unchanged
    });
  });

  describe('handleDeleteDraft', () => {
    it('should return 404 for non-existent draft', async () => {
      const response = await handleDeleteDraft(env, 'non-existent');

      expect(response.status).toBe(404);
    });

    it('should delete draft', async () => {
      const draft = await createDraft(env.DB, {
        title: 'To Delete',
        slug: 'to-delete',
        content: 'Content',
      });

      const response = await handleDeleteDraft(env, draft.id);

      expect(response.status).toBe(200);
      const data = await response.json() as { ok: boolean };
      expect(data.ok).toBe(true);

      const deleted = await getDraft(env.DB, draft.id);
      expect(deleted).toBeNull();
    });
  });

  describe('handlePublishDraft', () => {
    it('should return 400 for non-existent draft', async () => {
      const response = await handlePublishDraft(env, 'non-existent');

      expect(response.status).toBe(400);
      const data = await response.json() as { error: string };
      expect(data.error).toBe('Draft not found');
    });

    it('should publish draft and return post', async () => {
      const draft = await createDraft(env.DB, {
        title: 'Draft to Publish',
        slug: 'draft-to-publish',
        content: 'Content',
      });

      const response = await handlePublishDraft(env, draft.id);

      expect(response.status).toBe(200);
      const data = await response.json() as { id: string; title: string; publishedAt: string };
      expect(data.title).toBe('Draft to Publish');
      expect(data.publishedAt).toBeDefined();

      // Draft should be deleted
      const deletedDraft = await getDraft(env.DB, draft.id);
      expect(deletedDraft).toBeNull();
    });

    it('should return 400 for duplicate slug', async () => {
      const draft1 = await createDraft(env.DB, {
        title: 'First',
        slug: 'same-slug',
        content: 'C1',
      });
      const draft2 = await createDraft(env.DB, {
        title: 'Second',
        slug: 'same-slug',
        content: 'C2',
      });

      await handlePublishDraft(env, draft1.id);
      const response = await handlePublishDraft(env, draft2.id);

      expect(response.status).toBe(400);
      const data = await response.json() as { error: string };
      expect(data.error).toContain('already in use');
    });
  });

  describe('handleShareDraft', () => {
    it('should return 400 for non-existent draft', async () => {
      const response = await handleShareDraft(env, 'non-existent');

      expect(response.status).toBe(400);
    });

    it('should create share token and return URL', async () => {
      const draft = await createDraft(env.DB, {
        title: 'Draft to Share',
        slug: 'draft-to-share',
        content: 'Content',
      });

      const response = await handleShareDraft(env, draft.id);

      expect(response.status).toBe(200);
      const data = await response.json() as { token: string; url: string };
      expect(data.token).toBeDefined();
      expect(data.url).toContain('/draft/share/');
      expect(data.url).toContain(data.token);
    });

    it('should create usable share token', async () => {
      const draft = await createDraft(env.DB, {
        title: 'Draft to Share',
        slug: 'draft-to-share',
        content: 'Content',
      });

      const response = await handleShareDraft(env, draft.id);
      const data = await response.json() as { token: string };

      const sharedDraft = await getDraftByShareToken(env.DB, data.token);
      expect(sharedDraft).not.toBeNull();
      expect(sharedDraft!.id).toBe(draft.id);
    });
  });

  describe('handleRevokeShareDraft', () => {
    it('should return ok for draft without share token', async () => {
      const draft = await createDraft(env.DB, {
        title: 'Draft',
        slug: 'draft',
        content: 'Content',
      });

      const response = await handleRevokeShareDraft(env, draft.id);

      expect(response.status).toBe(200);
      const data = await response.json() as { ok: boolean };
      expect(data.ok).toBe(true);
    });

    it('should revoke share token', async () => {
      const draft = await createDraft(env.DB, {
        title: 'Draft',
        slug: 'draft',
        content: 'Content',
      });

      // Create share token
      const shareResponse = await handleShareDraft(env, draft.id);
      const shareData = await shareResponse.json() as { token: string };

      // Revoke it
      const revokeResponse = await handleRevokeShareDraft(env, draft.id);

      expect(revokeResponse.status).toBe(200);

      // Token should no longer work
      const sharedDraft = await getDraftByShareToken(env.DB, shareData.token);
      expect(sharedDraft).toBeNull();
    });
  });

  describe('handleGetDraftByShareToken', () => {
    it('should return 404 for non-existent token', async () => {
      const response = await handleGetDraftByShareToken(env, 'non-existent');

      expect(response.status).toBe(404);
      const data = await response.json() as { error: string };
      expect(data.error).toContain('not found');
    });

    it('should return draft by share token', async () => {
      const draft = await createDraft(env.DB, {
        title: 'Shared Draft',
        slug: 'shared-draft',
        content: 'Content',
      });

      const shareResponse = await handleShareDraft(env, draft.id);
      const shareData = await shareResponse.json() as { token: string };

      const response = await handleGetDraftByShareToken(env, shareData.token);

      expect(response.status).toBe(200);
      const data = await response.json() as { id?: string; title: string };
      // Public endpoint should not expose internal ID
      expect(data.id).toBeUndefined();
      expect(data.title).toBe('Shared Draft');
    });

    it('should include CORS headers', async () => {
      const response = await handleGetDraftByShareToken(env, 'any');

      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    });
  });
});
