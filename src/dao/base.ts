/**
 * Base DAO utilities for D1 database operations
 */

/**
 * Execute a SELECT query and return the first matching row, or null.
 */
export async function queryOne<T>(
  db: D1Database,
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const result = await db.prepare(sql).bind(...params).first<T>();
  return result ?? null;
}

/**
 * Execute a SELECT query and return all matching rows.
 */
export async function queryAll<T>(
  db: D1Database,
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const { results } = await db.prepare(sql).bind(...params).all<T>();
  return results;
}

/**
 * Execute a write statement (INSERT, UPDATE, DELETE) and return the number of rows changed.
 */
export async function execute(
  db: D1Database,
  sql: string,
  params: unknown[] = []
): Promise<number> {
  const result = await db.prepare(sql).bind(...params).run();
  return result.meta.changes;
}
