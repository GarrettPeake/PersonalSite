/**
 * File Upload API Handler
 *
 * Handles POST /api/admin/upload for uploading files to R2.
 */

import { Env } from '../../types';
import { jsonResponse, corsHeaders } from '../../lib/response';

/**
 * Allowed file types and their extensions
 */
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Generate a unique filename for R2 storage
 */
function generateFilename(ext: string): string {
  const timestamp = Date.now();
  const random = crypto.randomUUID().split('-')[0];
  return `${timestamp}-${random}.${ext}`;
}

/**
 * POST /api/admin/upload - Upload file to R2
 *
 * Expects multipart/form-data with a 'file' field.
 * Returns the public URL of the uploaded file.
 */
export async function handleUpload(request: Request, env: Env): Promise<Response> {
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

    if (!file || !(file instanceof File)) {
      return jsonResponse({ error: 'No file provided' }, corsHeaders, 400);
    }

    // Validate file type
    const mimeType = file.type;
    const ext = ALLOWED_TYPES[mimeType];

    if (!ext) {
      return jsonResponse(
        { error: `File type not allowed: ${mimeType}` },
        corsHeaders,
        400
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return jsonResponse(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        corsHeaders,
        400
      );
    }

    // Generate unique filename
    const filename = generateFilename(ext);

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();
    await env.R2.put(filename, arrayBuffer, {
      httpMetadata: {
        contentType: mimeType,
      },
    });

    // Construct the public URL
    const url = `https://files.gpeake.com/${filename}`;

    return jsonResponse({ url, filename }, corsHeaders);
  } catch (error) {
    console.error('Upload error:', error);
    return jsonResponse(
      { error: 'Failed to upload file' },
      corsHeaders,
      500
    );
  }
}
