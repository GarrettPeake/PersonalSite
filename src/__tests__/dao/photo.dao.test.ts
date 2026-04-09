/**
 * Photo DAO Tests
 *
 * Tests for photo CRUD operations against D1.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import {
  getPhoto,
  listPhotos,
  createPhoto,
  updatePhoto,
  deletePhoto,
} from '../../dao/photo.dao';


describe('Photo DAO', () => {
  beforeAll(async () => {
    await env.DB.exec(
      "CREATE TABLE IF NOT EXISTS photos (id TEXT PRIMARY KEY, url TEXT NOT NULL, filename TEXT NOT NULL, location TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '', published_at TEXT NOT NULL, updated_at TEXT NOT NULL)"
    );
  });

  beforeEach(async () => {
    await env.DB.exec('DELETE FROM photos');
  });

  describe('getPhoto', () => {
    it('should return null for non-existent photo', async () => {
      const photo = await getPhoto(env.DB, 'non-existent-id');
      expect(photo).toBeNull();
    });

    it('should return photo by ID', async () => {
      const created = await createPhoto(env.DB, {
        url: 'https://files.gpeake.com/photos/test.jpg',
        filename: 'photos/test.jpg',
        location: 'Tokyo, Japan',
        description: 'Cherry blossoms',
      });

      const retrieved = await getPhoto(env.DB, created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.location).toBe('Tokyo, Japan');
      expect(retrieved!.description).toBe('Cherry blossoms');
    });
  });

  describe('listPhotos', () => {
    it('should return empty array when no photos exist', async () => {
      const photos = await listPhotos(env.DB);
      expect(photos).toEqual([]);
    });

    it('should return all photos in order (newest first)', async () => {
      // Insert with explicit timestamps to guarantee ordering
      const photo1 = await createPhoto(env.DB, {
        url: 'https://files.gpeake.com/photos/1.jpg',
        filename: 'photos/1.jpg',
        location: 'Location 1',
        description: 'Photo 1',
      });
      // Update published_at to control ordering
      await updatePhoto(env.DB, photo1.id, {
        location: 'Location 1',
        description: 'Photo 1',
        publishedAt: '2024-01-01T00:00:00.000Z',
      });

      const photo2 = await createPhoto(env.DB, {
        url: 'https://files.gpeake.com/photos/2.jpg',
        filename: 'photos/2.jpg',
        location: 'Location 2',
        description: 'Photo 2',
      });
      await updatePhoto(env.DB, photo2.id, {
        location: 'Location 2',
        description: 'Photo 2',
        publishedAt: '2024-02-01T00:00:00.000Z',
      });

      const photo3 = await createPhoto(env.DB, {
        url: 'https://files.gpeake.com/photos/3.jpg',
        filename: 'photos/3.jpg',
        location: 'Location 3',
        description: 'Photo 3',
      });
      await updatePhoto(env.DB, photo3.id, {
        location: 'Location 3',
        description: 'Photo 3',
        publishedAt: '2024-03-01T00:00:00.000Z',
      });

      const photos = await listPhotos(env.DB);
      expect(photos).toHaveLength(3);
      expect(photos[0].description).toBe('Photo 3');
      expect(photos[1].description).toBe('Photo 2');
      expect(photos[2].description).toBe('Photo 1');
    });
  });

  describe('createPhoto', () => {
    it('should create photo with provided data', async () => {
      const photo = await createPhoto(env.DB, {
        url: 'https://files.gpeake.com/photos/test.jpg',
        filename: 'photos/test.jpg',
        location: 'Paris, France',
        description: 'Eiffel Tower',
      });

      expect(photo.id).toBeDefined();
      expect(photo.url).toBe('https://files.gpeake.com/photos/test.jpg');
      expect(photo.filename).toBe('photos/test.jpg');
      expect(photo.location).toBe('Paris, France');
      expect(photo.description).toBe('Eiffel Tower');
      expect(photo.publishedAt).toBeDefined();
      expect(photo.updatedAt).toBeDefined();
    });

    it('should be retrievable after creation', async () => {
      await createPhoto(env.DB, {
        url: 'https://files.gpeake.com/photos/test.jpg',
        filename: 'photos/test.jpg',
        location: 'Test',
        description: 'Test',
      });

      const photos = await listPhotos(env.DB);
      expect(photos).toHaveLength(1);
    });

    it('should create photo with empty location and description', async () => {
      const photo = await createPhoto(env.DB, {
        url: 'https://files.gpeake.com/photos/test.jpg',
        filename: 'photos/test.jpg',
        location: '',
        description: '',
      });

      expect(photo.location).toBe('');
      expect(photo.description).toBe('');
    });
  });

  describe('updatePhoto', () => {
    it('should return null for non-existent photo', async () => {
      const result = await updatePhoto(env.DB, 'non-existent', {
        location: 'New Location',
        description: 'New Description',
        publishedAt: new Date().toISOString(),
      });
      expect(result).toBeNull();
    });

    it('should update location and description', async () => {
      const created = await createPhoto(env.DB, {
        url: 'https://files.gpeake.com/photos/test.jpg',
        filename: 'photos/test.jpg',
        location: 'Original Location',
        description: 'Original Description',
      });

      const updated = await updatePhoto(env.DB, created.id, {
        location: 'Updated Location',
        description: 'Updated Description',
        publishedAt: created.publishedAt,
      });

      expect(updated).not.toBeNull();
      expect(updated!.location).toBe('Updated Location');
      expect(updated!.description).toBe('Updated Description');
      expect(updated!.url).toBe(created.url); // URL should not change
      expect(updated!.filename).toBe(created.filename); // Filename should not change
    });

    it('should update updatedAt timestamp', async () => {
      const created = await createPhoto(env.DB, {
        url: 'https://files.gpeake.com/photos/test.jpg',
        filename: 'photos/test.jpg',
        location: 'Location',
        description: 'Description',
      });
      const originalUpdatedAt = created.updatedAt;

      await new Promise((r) => setTimeout(r, 10));

      const updated = await updatePhoto(env.DB, created.id, {
        location: 'New Location',
        description: 'New Description',
        publishedAt: created.publishedAt,
      });

      expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      );
    });
  });

  describe('deletePhoto', () => {
    it('should return false for non-existent photo', async () => {
      const result = await deletePhoto(env.DB, 'non-existent');
      expect(result).toBe(false);
    });

    it('should delete photo from D1', async () => {
      const created = await createPhoto(env.DB, {
        url: 'https://files.gpeake.com/photos/test.jpg',
        filename: 'photos/test.jpg',
        location: 'Location',
        description: 'Description',
      });

      const result = await deletePhoto(env.DB, created.id);
      expect(result).toBe(true);

      const retrieved = await getPhoto(env.DB, created.id);
      expect(retrieved).toBeNull();
    });

    it('should remove photo from list', async () => {
      const created = await createPhoto(env.DB, {
        url: 'https://files.gpeake.com/photos/test.jpg',
        filename: 'photos/test.jpg',
        location: 'Location',
        description: 'Description',
      });

      await deletePhoto(env.DB, created.id);

      const photos = await listPhotos(env.DB);
      expect(photos).toHaveLength(0);
    });
  });
});
