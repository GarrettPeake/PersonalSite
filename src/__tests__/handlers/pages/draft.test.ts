/**
 * Draft Preview Page Handler Tests
 *
 * Tests for draft preview page rendering.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { handleDraftPreview } from '../../../handlers/pages/draft';
import { createDraft, createShareToken } from '../../../dao/draft.dao';
import { KV_PREFIX } from '../../../types';

describe('Draft Preview Page Handler', () => {
  beforeEach(async () => {
    // Clean up
    const prefixes = [KV_PREFIX.DRAFT, KV_PREFIX.SHARE];
    for (const prefix of prefixes) {
      const keys = await env.KV.list({ prefix });
      for (const key of keys.keys) {
        await env.KV.delete(key.name);
      }
    }
    await env.KV.delete(KV_PREFIX.INDEX_DRAFTS);
  });

  it('should return 404 for invalid path', async () => {
    const request = new Request('http://localhost/draft/invalid');
    const response = await handleDraftPreview(request, env, '/draft/invalid');

    expect(response.status).toBe(404);
  });

  it('should return 404 for non-existent token', async () => {
    const request = new Request('http://localhost/draft/share/non-existent');
    const response = await handleDraftPreview(request, env, '/draft/share/non-existent');

    expect(response.status).toBe(404);
    const html = await response.text();
    expect(html).toContain('Draft Not Found');
  });

  it('should render draft with content', async () => {
    const draft = await createDraft(env.KV, {
      title: 'My Draft',
      slug: 'my-draft',
      content: 'This is **draft** content.',
    });
    const token = await createShareToken(env.KV, draft.id);

    const request = new Request(`http://localhost/draft/share/${token}`);
    const response = await handleDraftPreview(request, env, `/draft/share/${token}`);

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('My Draft');
    expect(html).toContain('<strong>draft</strong>');
  });

  it('should show draft banner', async () => {
    const draft = await createDraft(env.KV, {
      title: 'Draft',
      slug: 'draft',
      content: 'Content',
    });
    const token = await createShareToken(env.KV, draft.id);

    const request = new Request(`http://localhost/draft/share/${token}`);
    const response = await handleDraftPreview(request, env, `/draft/share/${token}`);

    const html = await response.text();
    expect(html).toContain('draft-banner');
    expect(html).toContain('Draft Preview');
  });

  it('should include noindex meta tag', async () => {
    const draft = await createDraft(env.KV, {
      title: 'Draft',
      slug: 'draft',
      content: 'Content',
    });
    const token = await createShareToken(env.KV, draft.id);

    const request = new Request(`http://localhost/draft/share/${token}`);
    const response = await handleDraftPreview(request, env, `/draft/share/${token}`);

    const html = await response.text();
    expect(html).toContain('noindex');
  });

  it('should render HTML content type', async () => {
    const draft = await createDraft(env.KV, {
      title: 'Draft',
      slug: 'draft',
      content: 'Content',
    });
    const token = await createShareToken(env.KV, draft.id);

    const request = new Request(`http://localhost/draft/share/${token}`);
    const response = await handleDraftPreview(request, env, `/draft/share/${token}`);

    expect(response.headers.get('Content-Type')).toBe('text/html');
  });

  it('should include page structure', async () => {
    const draft = await createDraft(env.KV, {
      title: 'Draft',
      slug: 'draft',
      content: 'Content',
    });
    const token = await createShareToken(env.KV, draft.id);

    const request = new Request(`http://localhost/draft/share/${token}`);
    const response = await handleDraftPreview(request, env, `/draft/share/${token}`);

    const html = await response.text();
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<gp-site-header');
    expect(html).toContain('<gp-site-footer>');
  });

  it('should use updatedAt as date', async () => {
    const draft = await createDraft(env.KV, {
      title: 'Draft',
      slug: 'draft',
      content: 'Content',
    });
    const token = await createShareToken(env.KV, draft.id);

    const request = new Request(`http://localhost/draft/share/${token}`);
    const response = await handleDraftPreview(request, env, `/draft/share/${token}`);

    const html = await response.text();
    expect(html).toContain('post-meta');
  });

  it('should escape title for XSS prevention', async () => {
    const draft = await createDraft(env.KV, {
      title: '<script>alert("xss")</script>',
      slug: 'xss-test',
      content: 'Content',
    });
    const token = await createShareToken(env.KV, draft.id);

    const request = new Request(`http://localhost/draft/share/${token}`);
    const response = await handleDraftPreview(request, env, `/draft/share/${token}`);

    const html = await response.text();
    expect(html).not.toContain('<script>alert("xss")</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('should handle revoked share token', async () => {
    const draft = await createDraft(env.KV, {
      title: 'Draft',
      slug: 'draft',
      content: 'Content',
    });
    const token = await createShareToken(env.KV, draft.id);

    // Delete the share token lookup
    await env.KV.delete(`${KV_PREFIX.SHARE}${token}`);

    const request = new Request(`http://localhost/draft/share/${token}`);
    const response = await handleDraftPreview(request, env, `/draft/share/${token}`);

    expect(response.status).toBe(404);
    const html = await response.text();
    expect(html).toContain('invalid or has expired');
  });
});
