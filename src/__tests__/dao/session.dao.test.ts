/**
 * Session DAO Tests
 *
 * Comprehensive tests for session CRUD operations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { createSession, getSession, deleteSession } from '../../dao/session.dao';
import { KV_PREFIX } from '../../types';

describe('Session DAO', () => {
  beforeEach(async () => {
    // Clean up all session related keys
    const keys = await env.KV.list({ prefix: KV_PREFIX.SESSION });
    for (const key of keys.keys) {
      await env.KV.delete(key.name);
    }
  });

  describe('createSession', () => {
    it('should create session with token and expiration', async () => {
      const session = await createSession(env.KV, 3600);

      expect(session.token).toBeDefined();
      expect(session.token.length).toBeGreaterThan(0);
      expect(session.expiresAt).toBeDefined();
    });

    it('should set correct expiration time', async () => {
      const ttl = 3600; // 1 hour
      const beforeCreate = Date.now();
      const session = await createSession(env.KV, ttl);
      const afterCreate = Date.now();

      const expiresAt = new Date(session.expiresAt).getTime();
      const expectedMin = beforeCreate + ttl * 1000;
      const expectedMax = afterCreate + ttl * 1000;

      expect(expiresAt).toBeGreaterThanOrEqual(expectedMin);
      expect(expiresAt).toBeLessThanOrEqual(expectedMax);
    });

    it('should use default TTL when not specified', async () => {
      const beforeCreate = Date.now();
      const session = await createSession(env.KV);
      const afterCreate = Date.now();

      const expiresAt = new Date(session.expiresAt).getTime();
      const defaultTTL = 86400; // 24 hours default
      const expectedMin = beforeCreate + defaultTTL * 1000;
      const expectedMax = afterCreate + defaultTTL * 1000;

      expect(expiresAt).toBeGreaterThanOrEqual(expectedMin);
      expect(expiresAt).toBeLessThanOrEqual(expectedMax);
    });

    it('should store session in KV', async () => {
      const session = await createSession(env.KV, 3600);

      const stored = await env.KV.get(`${KV_PREFIX.SESSION}${session.token}`);
      expect(stored).toBeDefined();

      const parsed = JSON.parse(stored!);
      expect(parsed.token).toBe(session.token);
      expect(parsed.expiresAt).toBe(session.expiresAt);
    });

    it('should generate unique tokens', async () => {
      const session1 = await createSession(env.KV, 3600);
      const session2 = await createSession(env.KV, 3600);
      const session3 = await createSession(env.KV, 3600);

      expect(session1.token).not.toBe(session2.token);
      expect(session2.token).not.toBe(session3.token);
      expect(session1.token).not.toBe(session3.token);
    });
  });

  describe('getSession', () => {
    it('should return null for non-existent session', async () => {
      const session = await getSession(env.KV, 'non-existent-token');
      expect(session).toBeNull();
    });

    it('should return session by token', async () => {
      const created = await createSession(env.KV, 3600);
      const retrieved = await getSession(env.KV, created.token);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.token).toBe(created.token);
      expect(retrieved!.expiresAt).toBe(created.expiresAt);
    });

    it('should return null for expired session', async () => {
      // Create a session that expires in the past
      const token = crypto.randomUUID();
      const expiredSession = {
        token,
        expiresAt: new Date(Date.now() - 1000).toISOString(), // 1 second ago
      };
      await env.KV.put(`${KV_PREFIX.SESSION}${token}`, JSON.stringify(expiredSession));

      const retrieved = await getSession(env.KV, token);
      expect(retrieved).toBeNull();
    });

    it('should delete expired session when accessed', async () => {
      const token = crypto.randomUUID();
      const expiredSession = {
        token,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      };
      await env.KV.put(`${KV_PREFIX.SESSION}${token}`, JSON.stringify(expiredSession));

      await getSession(env.KV, token);

      // Session should be deleted
      const stored = await env.KV.get(`${KV_PREFIX.SESSION}${token}`);
      expect(stored).toBeNull();
    });

    it('should return valid session that has not expired', async () => {
      const created = await createSession(env.KV, 3600);
      const retrieved = await getSession(env.KV, created.token);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.token).toBe(created.token);
    });
  });

  describe('deleteSession', () => {
    it('should delete existing session', async () => {
      const created = await createSession(env.KV, 3600);

      await deleteSession(env.KV, created.token);

      const retrieved = await getSession(env.KV, created.token);
      expect(retrieved).toBeNull();
    });

    it('should not throw for non-existent session', async () => {
      // Should not throw
      await expect(deleteSession(env.KV, 'non-existent')).resolves.toBeUndefined();
    });

    it('should remove from KV', async () => {
      const created = await createSession(env.KV, 3600);

      await deleteSession(env.KV, created.token);

      const stored = await env.KV.get(`${KV_PREFIX.SESSION}${created.token}`);
      expect(stored).toBeNull();
    });

    it('should only delete specified session', async () => {
      const session1 = await createSession(env.KV, 3600);
      const session2 = await createSession(env.KV, 3600);

      await deleteSession(env.KV, session1.token);

      // Session1 should be deleted
      const retrieved1 = await getSession(env.KV, session1.token);
      expect(retrieved1).toBeNull();

      // Session2 should still exist
      const retrieved2 = await getSession(env.KV, session2.token);
      expect(retrieved2).not.toBeNull();
    });
  });
});
