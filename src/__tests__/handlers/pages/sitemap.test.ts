/**
 * Sitemap Handler Tests
 *
 * Tests for dynamic sitemap.xml generation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { handleSitemap } from '../../../handlers/pages/sitemap';
import { createDraft } from '../../../dao/draft.dao';
import { publishDraft } from '../../../dao/post.dao';
import { KV_PREFIX } from '../../../types';

describe('Sitemap Handler', () => {
  beforeEach(async () => {
    // Clean up KV
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

  it('should return XML content type', async () => {
    const response = await handleSitemap(env);
    expect(response.headers.get('Content-Type')).toBe('application/xml');
  });

  it('should return 200 status', async () => {
    const response = await handleSitemap(env);
    expect(response.status).toBe(200);
  });

  it('should include XML declaration and urlset', async () => {
    const response = await handleSitemap(env);
    const xml = await response.text();
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain('</urlset>');
  });

  it('should include all static pages', async () => {
    const response = await handleSitemap(env);
    const xml = await response.text();
    expect(xml).toContain('https://gpeake.com/');
    expect(xml).toContain('https://gpeake.com/about');
    expect(xml).toContain('https://gpeake.com/blog');
    expect(xml).toContain('https://gpeake.com/photography');
    expect(xml).toContain('https://gpeake.com/projects');
  });

  it('should not include admin routes', async () => {
    const response = await handleSitemap(env);
    const xml = await response.text();
    expect(xml).not.toContain('/admin');
  });

  it('should include published blog posts', async () => {
    const draft = await createDraft(env.KV, {
      title: 'Test Post',
      slug: 'test-post',
      content: 'Hello world',
    });
    await publishDraft(env.KV, draft.id);

    const response = await handleSitemap(env);
    const xml = await response.text();
    expect(xml).toContain('https://gpeake.com/blog/test-post');
  });

  it('should include lastmod for blog posts', async () => {
    const draft = await createDraft(env.KV, {
      title: 'Test Post',
      slug: 'test-post',
      content: 'Hello world',
    });
    await publishDraft(env.KV, draft.id);

    const response = await handleSitemap(env);
    const xml = await response.text();
    expect(xml).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
  });

  it('should include multiple blog posts', async () => {
    const draft1 = await createDraft(env.KV, {
      title: 'Post One',
      slug: 'post-one',
      content: 'First',
    });
    await publishDraft(env.KV, draft1.id);

    const draft2 = await createDraft(env.KV, {
      title: 'Post Two',
      slug: 'post-two',
      content: 'Second',
    });
    await publishDraft(env.KV, draft2.id);

    const response = await handleSitemap(env);
    const xml = await response.text();
    expect(xml).toContain('https://gpeake.com/blog/post-one');
    expect(xml).toContain('https://gpeake.com/blog/post-two');
  });

  it('should not include drafts', async () => {
    await createDraft(env.KV, {
      title: 'Draft Post',
      slug: 'draft-post',
      content: 'Not published',
    });

    const response = await handleSitemap(env);
    const xml = await response.text();
    expect(xml).not.toContain('draft-post');
  });

  it('should set cache-control header', async () => {
    const response = await handleSitemap(env);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
  });
});
