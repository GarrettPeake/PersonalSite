/**
 * Page Content Data Access Object
 *
 * Manages CMS-editable page content stored in KV.
 */

import { PageContent } from '../types';

/**
 * Get page content by KV key
 */
export async function getPageContent(kv: KVNamespace, key: string): Promise<PageContent | null> {
  const data = await kv.get(key);
  if (!data) return null;
  return JSON.parse(data);
}

/**
 * Create or update page content
 */
export async function updatePageContent(
  kv: KVNamespace,
  key: string,
  content: string
): Promise<PageContent> {
  const now = new Date().toISOString();
  const pageContent: PageContent = {
    content,
    updatedAt: now,
  };

  await kv.put(key, JSON.stringify(pageContent));
  return pageContent;
}
