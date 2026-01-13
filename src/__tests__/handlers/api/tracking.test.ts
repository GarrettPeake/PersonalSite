/**
 * Admin Tracking API Handlers Tests
 *
 * Tests for tracking slug management endpoints.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import {
  handleListTracking,
  handleCreateTracking,
  handleGetTracking,
  handleDeleteTracking,
} from '../../../handlers/api/tracking';
import { createTrackingSlug, getTrackingSlug, recordTrackingEvent } from '../../../dao/tracking.dao';
import { KV_PREFIX } from '../../../types';

describe('Admin Tracking API Handlers', () => {
  beforeEach(async () => {
    // Clean up all tracking related keys
    const keys = await env.KV.list({ prefix: KV_PREFIX.TRACKING });
    for (const key of keys.keys) {
      await env.KV.delete(key.name);
    }
    await env.KV.delete(KV_PREFIX.INDEX_TRACKING);
  });

  describe('handleListTracking', () => {
    it('should return empty array when no tracking slugs exist', async () => {
      const response = await handleListTracking(env);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual([]);
    });

    it('should return all tracking slugs', async () => {
      await createTrackingSlug(env.KV, 'Facebook', 'fb');
      await createTrackingSlug(env.KV, 'Twitter', 'tw');
      await createTrackingSlug(env.KV, 'LinkedIn', 'li');

      const response = await handleListTracking(env);

      expect(response.status).toBe(200);
      const data = await response.json() as Array<{ slug: string; tag: string }>;
      expect(data).toHaveLength(3);
    });

    it('should include CORS headers', async () => {
      const response = await handleListTracking(env);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('should return slugs in order (newest first)', async () => {
      await createTrackingSlug(env.KV, 'First', 'f1');
      await createTrackingSlug(env.KV, 'Second', 'f2');
      await createTrackingSlug(env.KV, 'Third', 'f3');

      const response = await handleListTracking(env);
      const data = await response.json() as Array<{ tag: string }>;

      expect(data[0].tag).toBe('Third');
      expect(data[1].tag).toBe('Second');
      expect(data[2].tag).toBe('First');
    });
  });

  describe('handleCreateTracking', () => {
    it('should create tracking slug with generated slug', async () => {
      const request = new Request('http://localhost/api/admin/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: 'New Recruiter' }),
      });

      const response = await handleCreateTracking(request, env);

      expect(response.status).toBe(200);
      const data = await response.json() as { slug: string; tag: string };
      expect(data.slug).toBeDefined();
      expect(data.slug.length).toBe(5);
      expect(data.tag).toBe('New Recruiter');
    });

    it('should create tracking slug with custom slug', async () => {
      const request = new Request('http://localhost/api/admin/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: 'Google', slug: 'goog' }),
      });

      const response = await handleCreateTracking(request, env);

      expect(response.status).toBe(200);
      const data = await response.json() as { slug: string; tag: string };
      expect(data.slug).toBe('goog');
      expect(data.tag).toBe('Google');
    });

    it('should return 400 for invalid slug', async () => {
      const request = new Request('http://localhost/api/admin/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: 'Test', slug: 'invalid-slug!' }),
      });

      const response = await handleCreateTracking(request, env);

      expect(response.status).toBe(400);
      const data = await response.json() as { error: string };
      expect(data.error).toContain('alphanumeric');
    });

    it('should return 400 for duplicate slug', async () => {
      await createTrackingSlug(env.KV, 'First', 'dup');

      const request = new Request('http://localhost/api/admin/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: 'Second', slug: 'dup' }),
      });

      const response = await handleCreateTracking(request, env);

      expect(response.status).toBe(400);
      const data = await response.json() as { error: string };
      expect(data.error).toContain('already exists');
    });

    it('should persist tracking slug in KV', async () => {
      const request = new Request('http://localhost/api/admin/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: 'Persisted', slug: 'per1' }),
      });

      await handleCreateTracking(request, env);

      const stored = await getTrackingSlug(env.KV, 'per1');
      expect(stored).not.toBeNull();
      expect(stored!.tag).toBe('Persisted');
    });
  });

  describe('handleGetTracking', () => {
    it('should return 404 for non-existent slug', async () => {
      const response = await handleGetTracking(env, 'nonexistent');

      expect(response.status).toBe(404);
      const data = await response.json() as { error: string };
      expect(data.error).toBe('Not found');
    });

    it('should return tracking slug by slug', async () => {
      await createTrackingSlug(env.KV, 'My Tag', 'mytag');

      const response = await handleGetTracking(env, 'mytag');

      expect(response.status).toBe(200);
      const data = await response.json() as { slug: string; tag: string; events: unknown[] };
      expect(data.slug).toBe('mytag');
      expect(data.tag).toBe('My Tag');
      expect(data.events).toEqual([]);
    });

    it('should include events in response', async () => {
      await createTrackingSlug(env.KV, 'With Events', 'evts');
      await recordTrackingEvent(env.KV, 'evts', { page: '/page1' });
      await recordTrackingEvent(env.KV, 'evts', { page: '/page2' });

      const response = await handleGetTracking(env, 'evts');

      expect(response.status).toBe(200);
      const data = await response.json() as { events: Array<{ page: string }> };
      expect(data.events).toHaveLength(2);
      expect(data.events[0].page).toBe('/page1');
      expect(data.events[1].page).toBe('/page2');
    });
  });

  describe('handleDeleteTracking', () => {
    it('should return 404 for non-existent slug', async () => {
      const response = await handleDeleteTracking(env, 'nonexistent');

      expect(response.status).toBe(404);
      const data = await response.json() as { error: string };
      expect(data.error).toBe('Not found');
    });

    it('should delete tracking slug', async () => {
      await createTrackingSlug(env.KV, 'To Delete', 'del1');

      const response = await handleDeleteTracking(env, 'del1');

      expect(response.status).toBe(200);
      const data = await response.json() as { ok: boolean };
      expect(data.ok).toBe(true);

      const deleted = await getTrackingSlug(env.KV, 'del1');
      expect(deleted).toBeNull();
    });

    it('should delete tracking slug with events', async () => {
      await createTrackingSlug(env.KV, 'With Events', 'evts');
      await recordTrackingEvent(env.KV, 'evts', { page: '/' });

      const response = await handleDeleteTracking(env, 'evts');

      expect(response.status).toBe(200);

      const deleted = await getTrackingSlug(env.KV, 'evts');
      expect(deleted).toBeNull();
    });
  });
});
