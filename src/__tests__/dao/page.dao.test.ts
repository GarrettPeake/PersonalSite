/**
 * Page DAO Tests
 *
 * Tests for page content CRUD operations against D1.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { getPageContent, updatePageContent } from '../../dao/page.dao';

describe('Page DAO', () => {
  beforeAll(async () => {
    await env.DB.exec(
      "CREATE TABLE IF NOT EXISTS pages (key TEXT PRIMARY KEY, content TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL)"
    );
  });

  beforeEach(async () => {
    await env.DB.exec('DELETE FROM pages');
  });

  describe('getPageContent', () => {
    it('should return null for nonexistent key', async () => {
      const result = await getPageContent(env.DB, 'nonexistent');
      expect(result).toBeNull();
    });

    it('should return saved content', async () => {
      await updatePageContent(env.DB, 'about', 'Hello world');

      const result = await getPageContent(env.DB, 'about');
      expect(result).not.toBeNull();
      expect(result!.content).toBe('Hello world');
      expect(result!.updatedAt).toBeDefined();
    });
  });

  describe('updatePageContent', () => {
    it('should create and return page content', async () => {
      const result = await updatePageContent(env.DB, 'about', 'Some content');

      expect(result.content).toBe('Some content');
      expect(result.updatedAt).toBeDefined();
      expect(new Date(result.updatedAt).getTime()).not.toBeNaN();
    });

    it('should replace existing content', async () => {
      await updatePageContent(env.DB, 'about', 'Original content');
      const updated = await updatePageContent(env.DB, 'about', 'Updated content');

      expect(updated.content).toBe('Updated content');

      const retrieved = await getPageContent(env.DB, 'about');
      expect(retrieved!.content).toBe('Updated content');
    });

    it('should handle different keys independently', async () => {
      await updatePageContent(env.DB, 'about', 'About page');
      await updatePageContent(env.DB, 'contact', 'Contact page');

      const about = await getPageContent(env.DB, 'about');
      const contact = await getPageContent(env.DB, 'contact');

      expect(about!.content).toBe('About page');
      expect(contact!.content).toBe('Contact page');
    });
  });
});
