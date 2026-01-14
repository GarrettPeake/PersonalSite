/**
 * Tracking DAO Tests
 *
 * Comprehensive tests for tracking slug operations and event recording.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import {
  getTrackingSlug,
  listTrackingSlugs,
  createTrackingSlug,
  deleteTrackingSlug,
  recordTrackingEvent,
} from '../../dao/tracking.dao';
import { KV_PREFIX } from '../../types';

describe('Tracking DAO', () => {
  beforeEach(async () => {
    // Clean up all tracking related keys
    const keys = await env.KV.list({ prefix: KV_PREFIX.TRACKING });
    for (const key of keys.keys) {
      await env.KV.delete(key.name);
    }
    await env.KV.delete(KV_PREFIX.INDEX_TRACKING);
  });

  describe('createTrackingSlug', () => {
    it('should create tracking slug with generated slug', async () => {
      const tracking = await createTrackingSlug(env.KV, 'Facebook Recruiter');

      expect(tracking.slug).toBeDefined();
      expect(tracking.slug.length).toBe(5);
      expect(tracking.tag).toBe('Facebook Recruiter');
      expect(tracking.createdAt).toBeDefined();
      expect(tracking.events).toEqual([]);
    });

    it('should create tracking slug with custom slug', async () => {
      const tracking = await createTrackingSlug(env.KV, 'Twitter', 'tw');

      expect(tracking.slug).toBe('tw');
      expect(tracking.tag).toBe('Twitter');
    });

    it('should store tracking in KV', async () => {
      const tracking = await createTrackingSlug(env.KV, 'Test');

      const stored = await env.KV.get(`${KV_PREFIX.TRACKING}${tracking.slug}`);
      expect(stored).toBeDefined();
      const parsed = JSON.parse(stored!);
      expect(parsed.tag).toBe('Test');
    });

    it('should add to index', async () => {
      const tracking = await createTrackingSlug(env.KV, 'Test');

      const indexData = await env.KV.get(KV_PREFIX.INDEX_TRACKING);
      const index = JSON.parse(indexData!);
      expect(index).toContain(tracking.slug);
    });

    it('should throw for duplicate slug', async () => {
      await createTrackingSlug(env.KV, 'First', 'dup');
      await expect(createTrackingSlug(env.KV, 'Second', 'dup')).rejects.toThrow(
        'Slug "dup" already exists'
      );
    });

    it('should throw for slug too short', async () => {
      await expect(createTrackingSlug(env.KV, 'Test', 'a')).rejects.toThrow(
        'Slug must be 2-10 alphanumeric characters'
      );
    });

    it('should throw for slug too long', async () => {
      await expect(createTrackingSlug(env.KV, 'Test', 'abcdefghijk')).rejects.toThrow(
        'Slug must be 2-10 alphanumeric characters'
      );
    });

    it('should throw for slug with special characters', async () => {
      await expect(createTrackingSlug(env.KV, 'Test', 'ab-cd')).rejects.toThrow(
        'Slug must be 2-10 alphanumeric characters'
      );
    });

    it('should accept uppercase slugs', async () => {
      const tracking = await createTrackingSlug(env.KV, 'Test', 'ABC123');
      expect(tracking.slug).toBe('ABC123');
    });
  });

  describe('getTrackingSlug', () => {
    it('should return null for non-existent slug', async () => {
      const tracking = await getTrackingSlug(env.KV, 'nonexistent');
      expect(tracking).toBeNull();
    });

    it('should return tracking slug by slug', async () => {
      await createTrackingSlug(env.KV, 'Test Tag', 'test1');

      const tracking = await getTrackingSlug(env.KV, 'test1');
      expect(tracking).not.toBeNull();
      expect(tracking!.slug).toBe('test1');
      expect(tracking!.tag).toBe('Test Tag');
    });
  });

  describe('listTrackingSlugs', () => {
    it('should return empty array when no tracking slugs exist', async () => {
      const slugs = await listTrackingSlugs(env.KV);
      expect(slugs).toEqual([]);
    });

    it('should return all tracking slugs', async () => {
      await createTrackingSlug(env.KV, 'Tag 1', 'slug1');
      await createTrackingSlug(env.KV, 'Tag 2', 'slug2');
      await createTrackingSlug(env.KV, 'Tag 3', 'slug3');

      const slugs = await listTrackingSlugs(env.KV);
      expect(slugs).toHaveLength(3);
    });

    it('should return slugs in order (newest first)', async () => {
      await createTrackingSlug(env.KV, 'Tag 1', 'slug1');
      await createTrackingSlug(env.KV, 'Tag 2', 'slug2');
      await createTrackingSlug(env.KV, 'Tag 3', 'slug3');

      const slugs = await listTrackingSlugs(env.KV);
      expect(slugs[0].tag).toBe('Tag 3');
      expect(slugs[1].tag).toBe('Tag 2');
      expect(slugs[2].tag).toBe('Tag 1');
    });
  });

  describe('deleteTrackingSlug', () => {
    it('should return false for non-existent slug', async () => {
      const result = await deleteTrackingSlug(env.KV, 'nonexistent');
      expect(result).toBe(false);
    });

    it('should delete tracking slug from KV', async () => {
      await createTrackingSlug(env.KV, 'Test', 'tst');

      const result = await deleteTrackingSlug(env.KV, 'tst');
      expect(result).toBe(true);

      const tracking = await getTrackingSlug(env.KV, 'tst');
      expect(tracking).toBeNull();
    });

    it('should remove from index', async () => {
      await createTrackingSlug(env.KV, 'Test', 'tst');
      await deleteTrackingSlug(env.KV, 'tst');

      const slugs = await listTrackingSlugs(env.KV);
      expect(slugs).toHaveLength(0);
    });

    it('should delete slug with events', async () => {
      await createTrackingSlug(env.KV, 'Test', 'tst');
      await recordTrackingEvent(env.KV, 'tst', { page: '/' });

      const result = await deleteTrackingSlug(env.KV, 'tst');
      expect(result).toBe(true);
    });
  });

  describe('recordTrackingEvent', () => {
    it('should return null for non-existent slug', async () => {
      const result = await recordTrackingEvent(env.KV, 'nonexistent', { page: '/' });
      expect(result).toBeNull();
    });

    it('should add event to tracking slug', async () => {
      await createTrackingSlug(env.KV, 'Test', 'tst');

      const result = await recordTrackingEvent(env.KV, 'tst', {
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
      await createTrackingSlug(env.KV, 'Test', 'tst');

      const beforeTime = new Date().toISOString();
      const result = await recordTrackingEvent(env.KV, 'tst', { page: '/' });
      const afterTime = new Date().toISOString();

      expect(result!.events[0].timestamp).toBeDefined();
      expect(result!.events[0].timestamp >= beforeTime).toBe(true);
      expect(result!.events[0].timestamp <= afterTime).toBe(true);
    });

    it('should append events (not replace)', async () => {
      await createTrackingSlug(env.KV, 'Test', 'tst');

      await recordTrackingEvent(env.KV, 'tst', { page: '/page1' });
      await recordTrackingEvent(env.KV, 'tst', { page: '/page2' });
      await recordTrackingEvent(env.KV, 'tst', { page: '/page3' });

      const tracking = await getTrackingSlug(env.KV, 'tst');
      expect(tracking!.events).toHaveLength(3);
      expect(tracking!.events[0].page).toBe('/page1');
      expect(tracking!.events[1].page).toBe('/page2');
      expect(tracking!.events[2].page).toBe('/page3');
    });

    it('should handle optional fields', async () => {
      await createTrackingSlug(env.KV, 'Test', 'tst');

      const result = await recordTrackingEvent(env.KV, 'tst', { page: '/' });

      expect(result!.events[0].page).toBe('/');
      expect(result!.events[0].referrer).toBeUndefined();
      expect(result!.events[0].userAgent).toBeUndefined();
    });

    it('should persist events in KV', async () => {
      await createTrackingSlug(env.KV, 'Test', 'tst');
      await recordTrackingEvent(env.KV, 'tst', { page: '/test' });

      // Retrieve directly from KV
      const data = await env.KV.get(`${KV_PREFIX.TRACKING}tst`);
      const tracking = JSON.parse(data!);
      expect(tracking.events).toHaveLength(1);
      expect(tracking.events[0].page).toBe('/test');
    });
  });
});
