/**
 * Photo DAO Tests
 *
 * Tests for photo CRUD operations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import {
  getPhoto,
  listPhotos,
  createPhoto,
  updatePhoto,
  deletePhoto,
} from '../../dao/photo.dao';
import { KV_PREFIX } from '../../types';

describe('Photo DAO', () => {
  beforeEach(async () => {
    // Clean up all photo related keys
    const photoKeys = await env.KV.list({ prefix: KV_PREFIX.PHOTO });
    for (const key of photoKeys.keys) {
      await env.KV.delete(key.name);
    }
    await env.KV.delete(KV_PREFIX.INDEX_PHOTOS);
  });

  describe('getPhoto', () => {
    it('should return null for non-existent photo', async () => {
      const photo = await getPhoto(env.KV, 'non-existent-id');
      expect(photo).toBeNull();
    });

    it('should return photo by ID', async () => {
      const created = await createPhoto(env.KV, {
        url: 'https://files.gpeake.com/photos/test.jpg',
        filename: 'photos/test.jpg',
        location: 'Tokyo, Japan',
        description: 'Cherry blossoms',
      });

      const retrieved = await getPhoto(env.KV, created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.location).toBe('Tokyo, Japan');
      expect(retrieved!.description).toBe('Cherry blossoms');
    });
  });

  describe('listPhotos', () => {
    it('should return empty array when no photos exist', async () => {
      const photos = await listPhotos(env.KV);
      expect(photos).toEqual([]);
    });

    it('should return all photos in order (newest first)', async () => {
      await createPhoto(env.KV, {
        url: 'https://files.gpeake.com/photos/1.jpg',
        filename: 'photos/1.jpg',
        location: 'Location 1',
        description: 'Photo 1',
      });
      await createPhoto(env.KV, {
        url: 'https://files.gpeake.com/photos/2.jpg',
        filename: 'photos/2.jpg',
        location: 'Location 2',
        description: 'Photo 2',
      });
      await createPhoto(env.KV, {
        url: 'https://files.gpeake.com/photos/3.jpg',
        filename: 'photos/3.jpg',
        location: 'Location 3',
        description: 'Photo 3',
      });

      const photos = await listPhotos(env.KV);
      expect(photos).toHaveLength(3);
      expect(photos[0].description).toBe('Photo 3');
      expect(photos[1].description).toBe('Photo 2');
      expect(photos[2].description).toBe('Photo 1');
    });
  });

  describe('createPhoto', () => {
    it('should create photo with provided data', async () => {
      const photo = await createPhoto(env.KV, {
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

    it('should add photo to index', async () => {
      await createPhoto(env.KV, {
        url: 'https://files.gpeake.com/photos/test.jpg',
        filename: 'photos/test.jpg',
        location: 'Test',
        description: 'Test',
      });

      const photos = await listPhotos(env.KV);
      expect(photos).toHaveLength(1);
    });

    it('should create photo with empty location and description', async () => {
      const photo = await createPhoto(env.KV, {
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
      const result = await updatePhoto(env.KV, 'non-existent', {
        location: 'New Location',
        description: 'New Description',
      });
      expect(result).toBeNull();
    });

    it('should update location and description', async () => {
      const created = await createPhoto(env.KV, {
        url: 'https://files.gpeake.com/photos/test.jpg',
        filename: 'photos/test.jpg',
        location: 'Original Location',
        description: 'Original Description',
      });

      const updated = await updatePhoto(env.KV, created.id, {
        location: 'Updated Location',
        description: 'Updated Description',
      });

      expect(updated).not.toBeNull();
      expect(updated!.location).toBe('Updated Location');
      expect(updated!.description).toBe('Updated Description');
      expect(updated!.url).toBe(created.url); // URL should not change
      expect(updated!.filename).toBe(created.filename); // Filename should not change
    });

    it('should update updatedAt timestamp', async () => {
      const created = await createPhoto(env.KV, {
        url: 'https://files.gpeake.com/photos/test.jpg',
        filename: 'photos/test.jpg',
        location: 'Location',
        description: 'Description',
      });
      const originalUpdatedAt = created.updatedAt;

      await new Promise((r) => setTimeout(r, 10));

      const updated = await updatePhoto(env.KV, created.id, {
        location: 'New Location',
        description: 'New Description',
      });

      expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      );
    });
  });

  describe('deletePhoto', () => {
    it('should return false for non-existent photo', async () => {
      const result = await deletePhoto(env.KV, 'non-existent');
      expect(result).toBe(false);
    });

    it('should delete photo from KV', async () => {
      const created = await createPhoto(env.KV, {
        url: 'https://files.gpeake.com/photos/test.jpg',
        filename: 'photos/test.jpg',
        location: 'Location',
        description: 'Description',
      });

      const result = await deletePhoto(env.KV, created.id);
      expect(result).toBe(true);

      const retrieved = await getPhoto(env.KV, created.id);
      expect(retrieved).toBeNull();
    });

    it('should remove photo from index', async () => {
      const created = await createPhoto(env.KV, {
        url: 'https://files.gpeake.com/photos/test.jpg',
        filename: 'photos/test.jpg',
        location: 'Location',
        description: 'Description',
      });

      await deletePhoto(env.KV, created.id);

      const photos = await listPhotos(env.KV);
      expect(photos).toHaveLength(0);
    });
  });
});
