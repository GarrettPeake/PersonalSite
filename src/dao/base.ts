/**
 * Base DAO utilities for KV index management
 *
 * The single-table KV design uses index arrays to track all IDs/slugs
 * for listing operations. These functions manage those indexes.
 */

/**
 * Get an index array from KV
 */
export async function getIndex(kv: KVNamespace, key: string): Promise<string[]> {
  const data = await kv.get(key);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

/**
 * Add an ID to the beginning of an index (newest first)
 */
export async function addToIndex(kv: KVNamespace, key: string, id: string): Promise<void> {
  const index = await getIndex(kv, key);
  if (!index.includes(id)) {
    index.unshift(id);
    await kv.put(key, JSON.stringify(index));
  }
}

/**
 * Remove an ID from an index
 */
export async function removeFromIndex(kv: KVNamespace, key: string, id: string): Promise<void> {
  const index = await getIndex(kv, key);
  const filtered = index.filter((item) => item !== id);
  await kv.put(key, JSON.stringify(filtered));
}
