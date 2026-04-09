/**
 * Page Content Data Access Object
 *
 * Manages CMS-editable page content stored in D1.
 */

import { queryOne, execute } from './base';
import { PageContent } from '../types';

/**
 * Get page content by key
 */
export async function getPageContent(db: D1Database, key: string): Promise<PageContent | null> {
  return queryOne<PageContent>(
    db,
    'SELECT content, updated_at as updatedAt FROM pages WHERE key = ?',
    [key]
  );
}

/**
 * Create or update page content
 */
export async function updatePageContent(
  db: D1Database,
  key: string,
  content: string
): Promise<PageContent> {
  const now = new Date().toISOString();

  await execute(
    db,
    'INSERT OR REPLACE INTO pages (key, content, updated_at) VALUES (?, ?, ?)',
    [key, content, now]
  );

  return { content, updatedAt: now };
}
