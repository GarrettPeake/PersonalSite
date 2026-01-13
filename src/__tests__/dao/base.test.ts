/**
 * Base DAO Tests
 *
 * Tests for index management utilities used across all DAOs.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { getIndex, addToIndex, removeFromIndex } from '../../dao/base';

const TEST_INDEX_KEY = 'test:index';

describe('Base DAO - Index Management', () => {
  beforeEach(async () => {
    // Clean up test index before each test
    await env.KV.delete(TEST_INDEX_KEY);
  });

  describe('getIndex', () => {
    it('should return empty array for non-existent index', async () => {
      const index = await getIndex(env.KV, TEST_INDEX_KEY);
      expect(index).toEqual([]);
    });

    it('should return parsed array for existing index', async () => {
      await env.KV.put(TEST_INDEX_KEY, JSON.stringify(['id1', 'id2', 'id3']));
      const index = await getIndex(env.KV, TEST_INDEX_KEY);
      expect(index).toEqual(['id1', 'id2', 'id3']);
    });

    it('should return empty array for invalid JSON', async () => {
      await env.KV.put(TEST_INDEX_KEY, 'not valid json');
      const index = await getIndex(env.KV, TEST_INDEX_KEY);
      expect(index).toEqual([]);
    });
  });

  describe('addToIndex', () => {
    it('should add ID to beginning of empty index', async () => {
      await addToIndex(env.KV, TEST_INDEX_KEY, 'id1');
      const index = await getIndex(env.KV, TEST_INDEX_KEY);
      expect(index).toEqual(['id1']);
    });

    it('should add new ID to beginning of existing index', async () => {
      await env.KV.put(TEST_INDEX_KEY, JSON.stringify(['id2', 'id3']));
      await addToIndex(env.KV, TEST_INDEX_KEY, 'id1');
      const index = await getIndex(env.KV, TEST_INDEX_KEY);
      expect(index).toEqual(['id1', 'id2', 'id3']);
    });

    it('should not add duplicate ID', async () => {
      await env.KV.put(TEST_INDEX_KEY, JSON.stringify(['id1', 'id2']));
      await addToIndex(env.KV, TEST_INDEX_KEY, 'id1');
      const index = await getIndex(env.KV, TEST_INDEX_KEY);
      expect(index).toEqual(['id1', 'id2']);
    });

    it('should add multiple IDs correctly', async () => {
      await addToIndex(env.KV, TEST_INDEX_KEY, 'id3');
      await addToIndex(env.KV, TEST_INDEX_KEY, 'id2');
      await addToIndex(env.KV, TEST_INDEX_KEY, 'id1');
      const index = await getIndex(env.KV, TEST_INDEX_KEY);
      expect(index).toEqual(['id1', 'id2', 'id3']);
    });
  });

  describe('removeFromIndex', () => {
    it('should remove existing ID from index', async () => {
      await env.KV.put(TEST_INDEX_KEY, JSON.stringify(['id1', 'id2', 'id3']));
      await removeFromIndex(env.KV, TEST_INDEX_KEY, 'id2');
      const index = await getIndex(env.KV, TEST_INDEX_KEY);
      expect(index).toEqual(['id1', 'id3']);
    });

    it('should handle removing non-existent ID', async () => {
      await env.KV.put(TEST_INDEX_KEY, JSON.stringify(['id1', 'id2']));
      await removeFromIndex(env.KV, TEST_INDEX_KEY, 'id3');
      const index = await getIndex(env.KV, TEST_INDEX_KEY);
      expect(index).toEqual(['id1', 'id2']);
    });

    it('should handle removing from empty index', async () => {
      await removeFromIndex(env.KV, TEST_INDEX_KEY, 'id1');
      const index = await getIndex(env.KV, TEST_INDEX_KEY);
      expect(index).toEqual([]);
    });

    it('should remove first ID', async () => {
      await env.KV.put(TEST_INDEX_KEY, JSON.stringify(['id1', 'id2', 'id3']));
      await removeFromIndex(env.KV, TEST_INDEX_KEY, 'id1');
      const index = await getIndex(env.KV, TEST_INDEX_KEY);
      expect(index).toEqual(['id2', 'id3']);
    });

    it('should remove last ID', async () => {
      await env.KV.put(TEST_INDEX_KEY, JSON.stringify(['id1', 'id2', 'id3']));
      await removeFromIndex(env.KV, TEST_INDEX_KEY, 'id3');
      const index = await getIndex(env.KV, TEST_INDEX_KEY);
      expect(index).toEqual(['id1', 'id2']);
    });
  });
});
