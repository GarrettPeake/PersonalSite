/**
 * Base DAO Tests
 *
 * Tests for D1 query utilities used across all DAOs.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { queryOne, queryAll, execute } from '../../dao/base';

describe('Base DAO - D1 utilities', () => {
  beforeAll(async () => {
    await env.DB.exec('CREATE TABLE IF NOT EXISTS test_items (id TEXT PRIMARY KEY, name TEXT NOT NULL, value INTEGER NOT NULL DEFAULT 0);');
  });

  beforeEach(async () => {
    await env.DB.exec('DELETE FROM test_items');
  });

  describe('execute', () => {
    it('should insert a row and return changes count', async () => {
      const changes = await execute(
        env.DB,
        'INSERT INTO test_items (id, name, value) VALUES (?, ?, ?)',
        ['1', 'test', 42]
      );
      expect(changes).toBe(1);
    });

    it('should return 0 when no rows affected', async () => {
      const changes = await execute(
        env.DB,
        'DELETE FROM test_items WHERE id = ?',
        ['nonexistent']
      );
      expect(changes).toBe(0);
    });

    it('should update rows', async () => {
      await execute(env.DB, 'INSERT INTO test_items (id, name, value) VALUES (?, ?, ?)', ['1', 'a', 1]);
      await execute(env.DB, 'INSERT INTO test_items (id, name, value) VALUES (?, ?, ?)', ['2', 'b', 2]);
      const changes = await execute(env.DB, 'UPDATE test_items SET value = ?', [99]);
      expect(changes).toBe(2);
    });
  });

  describe('queryOne', () => {
    it('should return a single row', async () => {
      await execute(env.DB, 'INSERT INTO test_items (id, name, value) VALUES (?, ?, ?)', ['1', 'hello', 10]);
      const row = await queryOne<{ id: string; name: string; value: number }>(
        env.DB,
        'SELECT * FROM test_items WHERE id = ?',
        ['1']
      );
      expect(row).toEqual({ id: '1', name: 'hello', value: 10 });
    });

    it('should return null when no match', async () => {
      const row = await queryOne(env.DB, 'SELECT * FROM test_items WHERE id = ?', ['nope']);
      expect(row).toBeNull();
    });
  });

  describe('queryAll', () => {
    it('should return all matching rows', async () => {
      await execute(env.DB, 'INSERT INTO test_items (id, name, value) VALUES (?, ?, ?)', ['1', 'a', 1]);
      await execute(env.DB, 'INSERT INTO test_items (id, name, value) VALUES (?, ?, ?)', ['2', 'b', 2]);
      await execute(env.DB, 'INSERT INTO test_items (id, name, value) VALUES (?, ?, ?)', ['3', 'c', 3]);
      const rows = await queryAll<{ id: string; name: string; value: number }>(
        env.DB,
        'SELECT * FROM test_items ORDER BY value ASC'
      );
      expect(rows).toHaveLength(3);
      expect(rows[0].name).toBe('a');
      expect(rows[2].name).toBe('c');
    });

    it('should return empty array when no matches', async () => {
      const rows = await queryAll(env.DB, 'SELECT * FROM test_items WHERE value > ?', [999]);
      expect(rows).toEqual([]);
    });
  });
});
