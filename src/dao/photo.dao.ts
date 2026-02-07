/**
 * Photo Data Access Object
 *
 * Manages photo metadata for the photography gallery.
 */

import { KV_PREFIX, Photo, PhotoCreateInput, PhotoUpdateInput } from '../types';
import { getIndex, addToIndex, removeFromIndex } from './base';

// ============================================================================
// Photo CRUD Operations
// ============================================================================

/**
 * Get a photo by ID
 */
export async function getPhoto(kv: KVNamespace, id: string): Promise<Photo | null> {
  const data = await kv.get(`${KV_PREFIX.PHOTO}${id}`);
  if (!data) return null;
  return JSON.parse(data);
}

/**
 * List all photos (newest first by publishedAt)
 */
export async function listPhotos(kv: KVNamespace): Promise<Photo[]> {
  const ids = await getIndex(kv, KV_PREFIX.INDEX_PHOTOS);
  const results = await Promise.all(ids.map(id => getPhoto(kv, id)));
  const photos = results.filter((photo): photo is Photo => photo !== null);

  photos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return photos;
}

/**
 * Create a new photo
 */
export async function createPhoto(
  kv: KVNamespace,
  data: PhotoCreateInput
): Promise<Photo> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const photo: Photo = {
    id,
    url: data.url,
    filename: data.filename,
    location: data.location,
    description: data.description,
    publishedAt: now,
    updatedAt: now,
  };

  await kv.put(`${KV_PREFIX.PHOTO}${id}`, JSON.stringify(photo));
  await addToIndex(kv, KV_PREFIX.INDEX_PHOTOS, id);

  return photo;
}

/**
 * Update photo metadata (location and description only)
 */
export async function updatePhoto(
  kv: KVNamespace,
  id: string,
  data: PhotoUpdateInput
): Promise<Photo | null> {
  const existing = await getPhoto(kv, id);
  if (!existing) return null;

  const updated: Photo = {
    ...existing,
    location: data.location,
    description: data.description,
    publishedAt: data.publishedAt,
    updatedAt: new Date().toISOString(),
  };

  await kv.put(`${KV_PREFIX.PHOTO}${id}`, JSON.stringify(updated));
  return updated;
}

/**
 * Delete a photo
 *
 * Note: This only removes the KV metadata. R2 file cleanup should be handled separately.
 */
export async function deletePhoto(kv: KVNamespace, id: string): Promise<boolean> {
  const photo = await getPhoto(kv, id);
  if (!photo) return false;

  await kv.delete(`${KV_PREFIX.PHOTO}${id}`);
  await removeFromIndex(kv, KV_PREFIX.INDEX_PHOTOS, id);

  return true;
}
