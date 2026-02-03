/**
 * Photos API Handlers Tests
 *
 * Tests for photo management endpoints.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import {
  handleListPhotosPublic,
  handleAdminListPhotos,
  handleAdminGetPhoto,
  handleUpdatePhoto,
  handleDeletePhoto,
} from '../../../handlers/api/photos';
import { createPhoto, getPhoto, listPhotos } from '../../../dao/photo.dao';
import { KV_PREFIX } from '../../../types';

describe('Photos API Handlers', () => {
  beforeEach(async () => {
    // Clean up all photo related keys
    const photoKeys = await env.KV.list({ prefix: KV_PREFIX.PHOTO });
    for (const key of photoKeys.keys) {
      await env.KV.delete(key.name);
    }
    await env.KV.delete(KV_PREFIX.INDEX_PHOTOS);
  });

  describe('handleListPhotosPublic', () => {
    it('should return empty array when no photos exist', async () => {
      const response = await handleListPhotosPublic(env);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual([]);
    });

    it('should return all photos with public fields only', async () => {
      await createPhoto(env.KV, {
        url: 'https://files.gpeake.com/photos/1.jpg',
        filename: 'photos/1.jpg',
        location: 'Tokyo',
        description: 'Cherry blossoms',
      });
      await createPhoto(env.KV, {
        url: 'https://files.gpeake.com/photos/2.jpg',
        filename: 'photos/2.jpg',
        location: 'Paris',
        description: 'Eiffel Tower',
      });

      const response = await handleListPhotosPublic(env);

      expect(response.status).toBe(200);
      const data = (await response.json()) as Array<{
        id: string;
        url: string;
        location: string;
        description: string;
        publishedAt: string;
        filename?: string;
        updatedAt?: string;
      }>;
      expect(data).toHaveLength(2);

      // Public list should NOT include filename or updatedAt
      expect(data[0].filename).toBeUndefined();
      expect(data[0].updatedAt).toBeUndefined();

      // Should NOT include internal ID in public response
      expect(data[0].id).toBeUndefined();

      // Should include public fields
      expect(data[0].url).toBeDefined();
      expect(data[0].location).toBeDefined();
      expect(data[0].description).toBeDefined();
      expect(data[0].publishedAt).toBeDefined();
    });

    it('should include CORS headers', async () => {
      const response = await handleListPhotosPublic(env);
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    });
  });

  describe('handleAdminListPhotos', () => {
    it('should return empty array when no photos exist', async () => {
      const response = await handleAdminListPhotos(env);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual([]);
    });

    it('should return all photos with full data', async () => {
      await createPhoto(env.KV, {
        url: 'https://files.gpeake.com/photos/1.jpg',
        filename: 'photos/1.jpg',
        location: 'Tokyo',
        description: 'Cherry blossoms',
      });

      const response = await handleAdminListPhotos(env);

      expect(response.status).toBe(200);
      const data = (await response.json()) as Array<{
        filename: string;
        updatedAt: string;
      }>;
      expect(data).toHaveLength(1);

      // Admin list should include all fields
      expect(data[0].filename).toBe('photos/1.jpg');
      expect(data[0].updatedAt).toBeDefined();
    });
  });

  describe('handleAdminGetPhoto', () => {
    it('should return 404 for non-existent photo', async () => {
      const response = await handleAdminGetPhoto(env, 'non-existent');

      expect(response.status).toBe(404);
      const data = (await response.json()) as { error: string };
      expect(data.error).toBe('Photo not found');
    });

    it('should return photo by ID', async () => {
      const created = await createPhoto(env.KV, {
        url: 'https://files.gpeake.com/photos/test.jpg',
        filename: 'photos/test.jpg',
        location: 'New York',
        description: 'Times Square',
      });

      const response = await handleAdminGetPhoto(env, created.id);

      expect(response.status).toBe(200);
      const data = (await response.json()) as { id: string; location: string };
      expect(data.id).toBe(created.id);
      expect(data.location).toBe('New York');
    });
  });

  describe('handleUpdatePhoto', () => {
    it('should return 404 for non-existent photo', async () => {
      const request = new Request('http://localhost/api/admin/photos/non-existent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: 'New Location', description: 'New Desc' }),
      });

      const response = await handleUpdatePhoto(request, env, 'non-existent');

      expect(response.status).toBe(404);
    });

    it('should update location and description', async () => {
      const created = await createPhoto(env.KV, {
        url: 'https://files.gpeake.com/photos/test.jpg',
        filename: 'photos/test.jpg',
        location: 'Original Location',
        description: 'Original Description',
      });

      const request = new Request(`http://localhost/api/admin/photos/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'Updated Location',
          description: 'Updated Description',
        }),
      });

      const response = await handleUpdatePhoto(request, env, created.id);

      expect(response.status).toBe(200);
      const data = (await response.json()) as { location: string; description: string };
      expect(data.location).toBe('Updated Location');
      expect(data.description).toBe('Updated Description');
    });

    it('should return 400 for missing fields', async () => {
      const created = await createPhoto(env.KV, {
        url: 'https://files.gpeake.com/photos/test.jpg',
        filename: 'photos/test.jpg',
        location: 'Location',
        description: 'Description',
      });

      const request = new Request(`http://localhost/api/admin/photos/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: 'Only Location' }),
      });

      const response = await handleUpdatePhoto(request, env, created.id);

      expect(response.status).toBe(400);
      const data = (await response.json()) as { error: string };
      expect(data.error).toContain('required');
    });
  });

  describe('handleDeletePhoto', () => {
    it('should return 404 for non-existent photo', async () => {
      const response = await handleDeletePhoto(env, 'non-existent');

      expect(response.status).toBe(404);
    });

    it('should delete photo from KV', async () => {
      const created = await createPhoto(env.KV, {
        url: 'https://files.gpeake.com/photos/test.jpg',
        filename: 'photos/test.jpg',
        location: 'Location',
        description: 'Description',
      });

      const response = await handleDeletePhoto(env, created.id);

      expect(response.status).toBe(200);
      const data = (await response.json()) as { success: boolean };
      expect(data.success).toBe(true);

      const deleted = await getPhoto(env.KV, created.id);
      expect(deleted).toBeNull();
    });

    it('should remove photo from list', async () => {
      const created = await createPhoto(env.KV, {
        url: 'https://files.gpeake.com/photos/test.jpg',
        filename: 'photos/test.jpg',
        location: 'Location',
        description: 'Description',
      });

      await handleDeletePhoto(env, created.id);

      const photos = await listPhotos(env.KV);
      expect(photos).toHaveLength(0);
    });
  });
});
