/**
 * Photos API Handler
 *
 * Handles CRUD operations for photography gallery.
 */

import { Env } from '../../types';
import { jsonResponse, corsHeaders } from '../../lib/response';
import { stripExif, isJpeg } from '../../lib/exif';
import {
  listPhotos,
  getPhoto,
  createPhoto,
  updatePhoto,
  deletePhoto,
} from '../../dao/photo.dao';

/**
 * Allowed image types for photos
 */
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Generate a unique filename for R2 storage
 */
function generateFilename(ext: string): string {
  const timestamp = Date.now();
  const random = crypto.randomUUID().split('-')[0];
  return `photos/${timestamp}-${random}.${ext}`;
}

// ============================================================================
// Public Endpoints
// ============================================================================

/**
 * GET /api/photos - List all photos (public)
 */
export async function handleListPhotosPublic(env: Env): Promise<Response> {
  try {
    const photos = await listPhotos(env.KV);

    // Return only public-facing data
    const publicPhotos = photos.map((photo) => ({
      id: photo.id,
      url: photo.url,
      location: photo.location,
      description: photo.description,
      publishedAt: photo.publishedAt,
    }));

    return jsonResponse(publicPhotos, corsHeaders);
  } catch (error) {
    console.error('Error listing photos:', error);
    return jsonResponse({ error: 'Failed to list photos' }, corsHeaders, 500);
  }
}

// ============================================================================
// Admin Endpoints
// ============================================================================

/**
 * GET /api/admin/photos - List all photos (admin)
 */
export async function handleAdminListPhotos(env: Env): Promise<Response> {
  try {
    const photos = await listPhotos(env.KV);
    return jsonResponse(photos, corsHeaders);
  } catch (error) {
    console.error('Error listing photos:', error);
    return jsonResponse({ error: 'Failed to list photos' }, corsHeaders, 500);
  }
}

/**
 * GET /api/admin/photos/:id - Get single photo
 */
export async function handleAdminGetPhoto(env: Env, id: string): Promise<Response> {
  try {
    const photo = await getPhoto(env.KV, id);

    if (!photo) {
      return jsonResponse({ error: 'Photo not found' }, corsHeaders, 404);
    }

    return jsonResponse(photo, corsHeaders);
  } catch (error) {
    console.error('Error getting photo:', error);
    return jsonResponse({ error: 'Failed to get photo' }, corsHeaders, 500);
  }
}

/**
 * POST /api/admin/photos - Create new photo
 *
 * Expects multipart/form-data with:
 * - file: The image file
 * - location: Location string
 * - description: Description string
 */
export async function handleCreatePhoto(request: Request, env: Env): Promise<Response> {
  try {
    const contentType = request.headers.get('content-type') || '';

    if (!contentType.includes('multipart/form-data')) {
      return jsonResponse(
        { error: 'Expected multipart/form-data' },
        corsHeaders,
        400
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const location = formData.get('location');
    const description = formData.get('description');

    if (!file || typeof file === 'string') {
      return jsonResponse({ error: 'No file provided' }, corsHeaders, 400);
    }

    // Cast to File type after validation
    const uploadedFile = file as File;

    // Validate file type
    const mimeType = uploadedFile.type;
    const ext = ALLOWED_TYPES[mimeType];

    if (!ext) {
      return jsonResponse(
        { error: `File type not allowed: ${mimeType}. Allowed: JPEG, PNG, WebP` },
        corsHeaders,
        400
      );
    }

    // Validate file size
    if (uploadedFile.size > MAX_FILE_SIZE) {
      return jsonResponse(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        corsHeaders,
        400
      );
    }

    // Read file data
    let arrayBuffer = await uploadedFile.arrayBuffer();

    // Strip EXIF data from JPEG images
    if (mimeType === 'image/jpeg' && isJpeg(arrayBuffer)) {
      arrayBuffer = stripExif(arrayBuffer);
    }

    // Generate unique filename
    const filename = generateFilename(ext);

    // Upload to R2
    await env.R2.put(filename, arrayBuffer, {
      httpMetadata: {
        contentType: mimeType,
      },
    });

    // Construct the public URL
    const url = `https://files.gpeake.com/${filename}`;

    // Create photo record in KV
    const photo = await createPhoto(env.KV, {
      url,
      filename,
      location: typeof location === 'string' ? location : '',
      description: typeof description === 'string' ? description : '',
    });

    return jsonResponse(photo, corsHeaders, 201);
  } catch (error) {
    console.error('Error creating photo:', error);
    return jsonResponse({ error: 'Failed to create photo' }, corsHeaders, 500);
  }
}

/**
 * PUT /api/admin/photos/:id - Update photo metadata
 *
 * Expects JSON body with:
 * - location: Location string
 * - description: Description string
 */
export async function handleUpdatePhoto(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  try {
    const body = await request.json() as { location?: string; description?: string };

    if (typeof body.location !== 'string' || typeof body.description !== 'string') {
      return jsonResponse(
        { error: 'location and description are required' },
        corsHeaders,
        400
      );
    }

    const photo = await updatePhoto(env.KV, id, {
      location: body.location,
      description: body.description,
    });

    if (!photo) {
      return jsonResponse({ error: 'Photo not found' }, corsHeaders, 404);
    }

    return jsonResponse(photo, corsHeaders);
  } catch (error) {
    console.error('Error updating photo:', error);
    return jsonResponse({ error: 'Failed to update photo' }, corsHeaders, 500);
  }
}

/**
 * DELETE /api/admin/photos/:id - Delete photo
 *
 * Removes both the KV record and the R2 file.
 */
export async function handleDeletePhoto(env: Env, id: string): Promise<Response> {
  try {
    // Get photo to find filename for R2 cleanup
    const photo = await getPhoto(env.KV, id);

    if (!photo) {
      return jsonResponse({ error: 'Photo not found' }, corsHeaders, 404);
    }

    // Delete from R2
    try {
      await env.R2.delete(photo.filename);
    } catch (r2Error) {
      console.error('Error deleting from R2:', r2Error);
      // Continue with KV deletion even if R2 fails
    }

    // Delete from KV
    const deleted = await deletePhoto(env.KV, id);

    if (!deleted) {
      return jsonResponse({ error: 'Failed to delete photo' }, corsHeaders, 500);
    }

    return jsonResponse({ success: true }, corsHeaders);
  } catch (error) {
    console.error('Error deleting photo:', error);
    return jsonResponse({ error: 'Failed to delete photo' }, corsHeaders, 500);
  }
}
