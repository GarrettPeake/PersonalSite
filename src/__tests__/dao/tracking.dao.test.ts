/**
 * Tracking DAO Tests
 *
 * Comprehensive tests for tracking slug operations and event recording against D1.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import {
  getTrackingSlug,
  listTrackingSlugs,
  createTrackingSlug,
  deleteTrackingSlug,
  recordTrackingEvent,
} from '../../dao/tracking.dao';

describe('Tracking DAO', () => {
  beforeAll(async () => {
    await env.DB.exec('PRAGMA foreign_keys = ON');
    await env.DB.exec("CREATE TABLE IF NOT EXISTS tracking_slugs (slug TEXT PRIMARY KEY, tag TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL)");
    await env.DB.exec('CREATE INDEX IF NOT EXISTS idx_tracking_slugs_created_at ON tracking_slugs(created_at DESC)');
    await env.DB.exec("CREATE TABLE IF NOT EXISTS tracking_events (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL REFERENCES tracking_slugs(slug) ON DELETE CASCADE, timestamp TEXT NOT NULL, page TEXT NOT NULL, referrer TEXT, user_agent TEXT)");
    await env.DB.exec('CREATE INDEX IF NOT EXISTS idx_tracking_events_slug ON tracking_events(slug, timestamp ASC)');
  });

  beforeEach(async () => {
    await env.DB.exec('DELETE FROM tracking_events');
    await env.DB.exec('DELETE FROM tracking_slugs');
  });

  describe('createTrackingSlug', () => {
    it('should create tracking slug with generated slug', async () => {
      const tracking = await createTrackingSlug(env.DB, 'Facebook Recruiter');

      expect(tracking.slug).toBeDefined();
      expect(tracking.slug.length).toBe(5);
      expect(tracking.tag).toBe('Facebook Recruiter');
      expect(tracking.createdAt).toBeDefined();
      expect(tracking.events).toEqual([]);
    });

    it('should create tracking slug with custom slug', async () => {
      const tracking = await createTrackingSlug(env.DB, 'Twitter', 'tw');

      expect(tracking.slug).toBe('tw');
      expect(tracking.tag).toBe('Twitter');
    });

    it('should store tracking in D1', async () => {
      const tracking = await createTrackingSlug(env.DB, 'Test');

      const row = await env.DB.prepare('SELECT slug, tag FROM tracking_slugs WHERE slug = ?')
        .bind(tracking.slug).first();
      expect(row).toBeDefined();
      expect((row as any).tag).toBe('Test');
    });

    it('should throw for duplicate slug', async () => {
      await createTrackingSlug(env.DB, 'First', 'dup');
      await expect(createTrackingSlug(env.DB, 'Second', 'dup')).rejects.toThrow(
        'Slug "dup" already exists'
      );
    });

    it('should throw for slug too short', async () => {
      await expect(createTrackingSlug(env.DB, 'Test', 'a')).rejects.toThrow(
        'Slug must be 2-10 alphanumeric characters'
      );
    });

    it('should throw for slug too long', async () => {
      await expect(createTrackingSlug(env.DB, 'Test', 'abcdefghijk')).rejects.toThrow(
        'Slug must be 2-10 alphanumeric characters'
      );
    });

    it('should throw for slug with special characters', async () => {
      await expect(createTrackingSlug(env.DB, 'Test', 'ab-cd')).rejects.toThrow(
        'Slug must be 2-10 alphanumeric characters'
      );
    });

    it('should accept uppercase slugs', async () => {
      const tracking = await createTrackingSlug(env.DB, 'Test', 'ABC123');
      expect(tracking.slug).toBe('ABC123');
    });
  });

  describe('getTrackingSlug', () => {
    it('should return null for non-existent slug', async () => {
      const tracking = await getTrackingSlug(env.DB, 'nonexistent');
      expect(tracking).toBeNull();
    });

    it('should return tracking slug by slug', async () => {
      await createTrackingSlug(env.DB, 'Test Tag', 'test1');

      const tracking = await getTrackingSlug(env.DB, 'test1');
      expect(tracking).not.toBeNull();
      expect(tracking!.slug).toBe('test1');
      expect(tracking!.tag).toBe('Test Tag');
    });
  });

  describe('listTrackingSlugs', () => {
    it('should return empty array when no tracking slugs exist', async () => {
      const slugs = await listTrackingSlugs(env.DB);
      expect(slugs).toEqual([]);
    });

    it('should return all tracking slugs', async () => {
      await createTrackingSlug(env.DB, 'Tag 1', 'slug1');
      await createTrackingSlug(env.DB, 'Tag 2', 'slug2');
      await createTrackingSlug(env.DB, 'Tag 3', 'slug3');

      const slugs = await listTrackingSlugs(env.DB);
      expect(slugs).toHaveLength(3);
    });

    it('should return slugs in order (newest first)', async () => {
      // Insert with explicit timestamps to guarantee ordering
      await env.DB.prepare('INSERT INTO tracking_slugs (slug, tag, created_at) VALUES (?, ?, ?)')
        .bind('slug1', 'Tag 1', '2024-01-01T00:00:00.000Z').run();
      await env.DB.prepare('INSERT INTO tracking_slugs (slug, tag, created_at) VALUES (?, ?, ?)')
        .bind('slug2', 'Tag 2', '2024-02-01T00:00:00.000Z').run();
      await env.DB.prepare('INSERT INTO tracking_slugs (slug, tag, created_at) VALUES (?, ?, ?)')
        .bind('slug3', 'Tag 3', '2024-03-01T00:00:00.000Z').run();

      const slugs = await listTrackingSlugs(env.DB);
      expect(slugs[0].tag).toBe('Tag 3');
      expect(slugs[1].tag).toBe('Tag 2');
      expect(slugs[2].tag).toBe('Tag 1');
    });

    it('should return eventCount instead of full events array', async () => {
      await createTrackingSlug(env.DB, 'Tag 1', 'slug1');
      await recordTrackingEvent(env.DB, 'slug1', { page: '/page1' });
      await recordTrackingEvent(env.DB, 'slug1', { page: '/page2' });

      const slugs = await listTrackingSlugs(env.DB);
      expect(slugs).toHaveLength(1);
      expect(slugs[0].eventCount).toBe(2);
      expect((slugs[0] as any).events).toBeUndefined();
    });
  });

  describe('deleteTrackingSlug', () => {
    it('should return false for non-existent slug', async () => {
      const result = await deleteTrackingSlug(env.DB, 'nonexistent');
      expect(result).toBe(false);
    });

    it('should delete tracking slug from D1', async () => {
      await createTrackingSlug(env.DB, 'Test', 'tst');

      const result = await deleteTrackingSlug(env.DB, 'tst');
      expect(result).toBe(true);

      const tracking = await getTrackingSlug(env.DB, 'tst');
      expect(tracking).toBeNull();
    });

    it('should remove from listing', async () => {
      await createTrackingSlug(env.DB, 'Test', 'tst');
      await deleteTrackingSlug(env.DB, 'tst');

      const slugs = await listTrackingSlugs(env.DB);
      expect(slugs).toHaveLength(0);
    });

    it('should delete slug with events (CASCADE)', async () => {
      await createTrackingSlug(env.DB, 'Test', 'tst');
      await recordTrackingEvent(env.DB, 'tst', { page: '/' });

      const result = await deleteTrackingSlug(env.DB, 'tst');
      expect(result).toBe(true);

      // Verify events are also deleted
      const events = await env.DB.prepare('SELECT COUNT(*) as cnt FROM tracking_events WHERE slug = ?')
        .bind('tst').first<{ cnt: number }>();
      expect(events!.cnt).toBe(0);
    });
  });

  describe('recordTrackingEvent', () => {
    it('should return null for non-existent slug', async () => {
      const result = await recordTrackingEvent(env.DB, 'nonexistent', { page: '/' });
      expect(result).toBeNull();
    });

    it('should add event to tracking slug', async () => {
      await createTrackingSlug(env.DB, 'Test', 'tst');

      const result = await recordTrackingEvent(env.DB, 'tst', {
        page: '/blog/my-post',
        referrer: 'https://google.com',
        userAgent: 'Mozilla/5.0',
      });

      expect(result).not.toBeNull();
      expect(result!.events).toHaveLength(1);
      expect(result!.events[0].page).toBe('/blog/my-post');
      expect(result!.events[0].referrer).toBe('https://google.com');
      expect(result!.events[0].userAgent).toBe('Mozilla/5.0');
      expect(result!.events[0].timestamp).toBeDefined();
    });

    it('should add timestamp automatically', async () => {
      await createTrackingSlug(env.DB, 'Test', 'tst');

      const beforeTime = new Date().toISOString();
      const result = await recordTrackingEvent(env.DB, 'tst', { page: '/' });
      const afterTime = new Date().toISOString();

      expect(result!.events[0].timestamp).toBeDefined();
      expect(result!.events[0].timestamp >= beforeTime).toBe(true);
      expect(result!.events[0].timestamp <= afterTime).toBe(true);
    });

    it('should append events (not replace)', async () => {
      await createTrackingSlug(env.DB, 'Test', 'tst');

      await recordTrackingEvent(env.DB, 'tst', { page: '/page1' });
      await recordTrackingEvent(env.DB, 'tst', { page: '/page2' });
      await recordTrackingEvent(env.DB, 'tst', { page: '/page3' });

      const tracking = await getTrackingSlug(env.DB, 'tst');
      expect(tracking!.events).toHaveLength(3);
      expect(tracking!.events[0].page).toBe('/page1');
      expect(tracking!.events[1].page).toBe('/page2');
      expect(tracking!.events[2].page).toBe('/page3');
    });

    it('should handle optional fields', async () => {
      await createTrackingSlug(env.DB, 'Test', 'tst');

      const result = await recordTrackingEvent(env.DB, 'tst', { page: '/' });

      expect(result!.events[0].page).toBe('/');
      expect(result!.events[0].referrer).toBeUndefined();
      expect(result!.events[0].userAgent).toBeUndefined();
    });

    it('should persist events in D1', async () => {
      await createTrackingSlug(env.DB, 'Test', 'tst');
      await recordTrackingEvent(env.DB, 'tst', { page: '/test' });

      // Retrieve directly from D1
      const row = await env.DB.prepare('SELECT page FROM tracking_events WHERE slug = ?')
        .bind('tst').first<{ page: string }>();
      expect(row).toBeDefined();
      expect(row!.page).toBe('/test');
    });

    it('should enforce MAX_EVENTS cap', async () => {
      await createTrackingSlug(env.DB, 'Test', 'cap');

      // Insert MAX_EVENTS + 5 events directly for speed
      const stmts = [];
      for (let i = 0; i < 10005; i++) {
        stmts.push(
          env.DB.prepare(
            'INSERT INTO tracking_events (slug, timestamp, page, referrer, user_agent) VALUES (?, ?, ?, ?, ?)'
          ).bind('cap', `2024-01-01T00:00:${String(i).padStart(5, '0')}Z`, `/page-${i}`, null, null)
        );
      }
      // Batch in chunks of 100
      for (let i = 0; i < stmts.length; i += 100) {
        await env.DB.batch(stmts.slice(i, i + 100));
      }

      // Record one more event which should trigger cap enforcement
      await recordTrackingEvent(env.DB, 'cap', { page: '/newest' });

      const countRow = await env.DB.prepare('SELECT COUNT(*) as cnt FROM tracking_events WHERE slug = ?')
        .bind('cap').first<{ cnt: number }>();
      expect(countRow!.cnt).toBe(10000);
    });
  });
});
