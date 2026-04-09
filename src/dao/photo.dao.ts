/**
 * Photo Data Access Object
 *
 * Manages photo metadata for the photography gallery using D1.
 */

import { queryOne, queryAll, execute } from './base';
import { Photo, PhotoCreateInput, PhotoUpdateInput } from '../types';

const PHOTO_COLUMNS = 'id, url, filename, location, description, published_at as publishedAt, updated_at as updatedAt';

// ============================================================================
// Photo CRUD Operations
// ============================================================================

/**
 * Get a photo by ID
 */
export async function getPhoto(db: D1Database, id: string): Promise<Photo | null> {
  return queryOne<Photo>(db, `SELECT ${PHOTO_COLUMNS} FROM photos WHERE id = ?`, [id]);
}

/**
 * List all photos (newest first by publishedAt)
 */
export async function listPhotos(db: D1Database): Promise<Photo[]> {
  return queryAll<Photo>(db, `SELECT ${PHOTO_COLUMNS} FROM photos ORDER BY published_at DESC`);
}

/**
 * Create a new photo
 */
export async function createPhoto(
  db: D1Database,
  data: PhotoCreateInput
): Promise<Photo> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await execute(
    db,
    'INSERT INTO photos (id, url, filename, location, description, published_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, data.url, data.filename, data.location, data.description, now, now]
  );

  return {
    id,
    url: data.url,
    filename: data.filename,
    location: data.location,
    description: data.description,
    publishedAt: now,
    updatedAt: now,
  };
}

/**
 * Update photo metadata (location, description, and publishedAt)
 */
export async function updatePhoto(
  db: D1Database,
  id: string,
  data: PhotoUpdateInput
): Promise<Photo | null> {
  const existing = await getPhoto(db, id);
  if (!existing) return null;

  const now = new Date().toISOString();

  await execute(
    db,
    'UPDATE photos SET location = ?, description = ?, published_at = ?, updated_at = ? WHERE id = ?',
    [data.location, data.description, data.publishedAt, now, id]
  );

  return {
    ...existing,
    location: data.location,
    description: data.description,
    publishedAt: data.publishedAt,
    updatedAt: now,
  };
}

/**
 * Delete a photo
 *
 * Note: This only removes the D1 record. R2 file cleanup should be handled separately.
 */
export async function deletePhoto(db: D1Database, id: string): Promise<boolean> {
  const existing = await getPhoto(db, id);
  if (!existing) return false;

  await execute(db, 'DELETE FROM photos WHERE id = ?', [id]);
  return true;
}
