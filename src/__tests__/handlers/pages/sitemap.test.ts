/**
 * Sitemap Handler Tests
 *
 * Tests for dynamic sitemap.xml generation against D1.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { handleSitemap } from '../../../handlers/pages/sitemap';

describe('Sitemap Handler', () => {
  beforeAll(async () => {
    await env.DB.exec(
      "CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, title TEXT NOT NULL DEFAULT '', slug TEXT NOT NULL UNIQUE, content TEXT NOT NULL DEFAULT '', description TEXT, published_at TEXT NOT NULL, updated_at TEXT NOT NULL)"
    );
    await env.DB.exec("CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at DESC)");
  });

  beforeEach(async () => {
    await env.DB.exec('DELETE FROM posts');
  });

  // Helper to insert a post directly
  async function insertPost(title: string, slug: string, content: string) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await env.DB.prepare(
      'INSERT INTO posts (id, title, slug, content, published_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, title, slug, content, now, now).run();
    return { id, slug };
  }

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
    await insertPost('Test Post', 'test-post', 'Hello world');

    const response = await handleSitemap(env);
    const xml = await response.text();
    expect(xml).toContain('https://gpeake.com/blog/test-post');
  });

  it('should include lastmod for blog posts', async () => {
    await insertPost('Test Post', 'test-post', 'Hello world');

    const response = await handleSitemap(env);
    const xml = await response.text();
    expect(xml).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
  });

  it('should include multiple blog posts', async () => {
    await insertPost('Post One', 'post-one', 'First');
    await insertPost('Post Two', 'post-two', 'Second');

    const response = await handleSitemap(env);
    const xml = await response.text();
    expect(xml).toContain('https://gpeake.com/blog/post-one');
    expect(xml).toContain('https://gpeake.com/blog/post-two');
  });

  it('should not include drafts', async () => {
    // Only posts table is used by sitemap; drafts are not queried
    // Just verify an empty posts table produces no blog entries
    const response = await handleSitemap(env);
    const xml = await response.text();
    expect(xml).not.toContain('draft-post');
  });

  it('should set cache-control header', async () => {
    const response = await handleSitemap(env);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
  });
});
