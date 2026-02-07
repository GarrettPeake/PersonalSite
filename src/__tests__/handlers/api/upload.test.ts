/**
 * File Upload API Handler Tests
 *
 * Tests for file upload endpoint.
 */

import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { handleUpload } from '../../../handlers/api/upload';

describe('Upload API Handler', () => {
  // Note: R2 cleanup is handled automatically by isolated storage in @cloudflare/vitest-pool-workers.
  // Manually listing/deleting R2 objects in beforeEach interferes with the isolated storage frame stack.

  describe('handleUpload', () => {
    it('should return 400 for non-multipart request', async () => {
      const request = new Request('http://localhost/api/admin/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: 'test' }),
      });

      const response = await handleUpload(request, env);

      expect(response.status).toBe(400);
      const data = await response.json() as { error: string };
      expect(data.error).toBe('Expected multipart/form-data');
    });

    it('should return 400 when no file provided', async () => {
      const formData = new FormData();

      const request = new Request('http://localhost/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await handleUpload(request, env);

      expect(response.status).toBe(400);
      const data = await response.json() as { error: string };
      expect(data.error).toBe('No file provided');
    });

    it('should return 400 for unsupported file type', async () => {
      const formData = new FormData();
      const file = new File(['test content'], 'test.exe', { type: 'application/x-msdownload' });
      formData.append('file', file);

      const request = new Request('http://localhost/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await handleUpload(request, env);

      expect(response.status).toBe(400);
      const data = await response.json() as { error: string };
      expect(data.error).toContain('File type not allowed');
    });

    it('should upload JPEG image successfully', async () => {
      const formData = new FormData();
      const imageContent = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]); // JPEG magic bytes
      const file = new File([imageContent], 'test.jpg', { type: 'image/jpeg' });
      formData.append('file', file);

      const request = new Request('http://localhost/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await handleUpload(request, env);

      expect(response.status).toBe(200);
      const data = await response.json() as { url: string; filename: string };
      expect(data.url).toContain('https://files.gpeake.com/');
      expect(data.filename).toContain('.jpg');
    });

    it('should upload PNG image successfully', async () => {
      const formData = new FormData();
      const pngBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      const file = new File([pngBytes], 'test.png', { type: 'image/png' });
      formData.append('file', file);

      const request = new Request('http://localhost/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await handleUpload(request, env);

      expect(response.status).toBe(200);
      const data = await response.json() as { filename: string };
      expect(data.filename).toContain('.png');
    });

    it('should upload GIF image successfully', async () => {
      const formData = new FormData();
      const gifBytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
      const file = new File([gifBytes], 'test.gif', { type: 'image/gif' });
      formData.append('file', file);

      const request = new Request('http://localhost/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await handleUpload(request, env);

      expect(response.status).toBe(200);
      const data = await response.json() as { filename: string };
      expect(data.filename).toContain('.gif');
    });

    it('should upload WebP image successfully', async () => {
      const formData = new FormData();
      // RIFF....WEBP
      const webpBytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
      const file = new File([webpBytes], 'test.webp', { type: 'image/webp' });
      formData.append('file', file);

      const request = new Request('http://localhost/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await handleUpload(request, env);

      expect(response.status).toBe(200);
      const data = await response.json() as { filename: string };
      expect(data.filename).toContain('.webp');
    });

    it('should reject SVG uploads (XSS risk)', async () => {
      const formData = new FormData();
      const file = new File(['<svg></svg>'], 'test.svg', { type: 'image/svg+xml' });
      formData.append('file', file);

      const request = new Request('http://localhost/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await handleUpload(request, env);

      expect(response.status).toBe(400);
      const data = await response.json() as { error: string };
      expect(data.error).toContain('File type not allowed');
    });

    it('should upload PDF successfully', async () => {
      const formData = new FormData();
      const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34]); // %PDF-1.4
      const file = new File([pdfBytes], 'test.pdf', { type: 'application/pdf' });
      formData.append('file', file);

      const request = new Request('http://localhost/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await handleUpload(request, env);

      expect(response.status).toBe(200);
      const data = await response.json() as { filename: string };
      expect(data.filename).toContain('.pdf');
    });

    it('should upload HTML file successfully', async () => {
      const formData = new FormData();
      const file = new File(['<html><body>Hello</body></html>'], 'snippet.html', { type: 'text/html' });
      formData.append('file', file);

      const request = new Request('http://localhost/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await handleUpload(request, env);

      expect(response.status).toBe(200);
      const data = await response.json() as { filename: string };
      expect(data.filename).toContain('.html');
    });

    it('should store file in R2', async () => {
      const formData = new FormData();
      const jpegBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]);
      const file = new File([jpegBytes], 'test.jpg', { type: 'image/jpeg' });
      formData.append('file', file);

      const request = new Request('http://localhost/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await handleUpload(request, env);
      const data = await response.json() as { filename: string };

      // Verify file is in R2
      const stored = await env.R2.get(data.filename);
      expect(stored).not.toBeNull();

      const storedContent = await stored!.arrayBuffer();
      expect(storedContent.byteLength).toBeGreaterThan(0);
    });

    it('should set correct content type in R2', async () => {
      const formData = new FormData();
      const pngBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      const file = new File([pngBytes], 'test.png', { type: 'image/png' });
      formData.append('file', file);

      const request = new Request('http://localhost/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await handleUpload(request, env);
      const data = await response.json() as { filename: string };

      const stored = await env.R2.get(data.filename);
      expect(stored).not.toBeNull();
      expect(stored!.httpMetadata?.contentType).toBe('image/png');
      // Must consume the R2 object body to avoid isolated storage frame errors
      await stored!.arrayBuffer();
    });

    it('should generate unique filenames', async () => {
      const jpegBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]);
      const formData1 = new FormData();
      const file1 = new File([jpegBytes], 'same.jpg', { type: 'image/jpeg' });
      formData1.append('file', file1);

      const formData2 = new FormData();
      const file2 = new File([jpegBytes], 'same.jpg', { type: 'image/jpeg' });
      formData2.append('file', file2);

      const request1 = new Request('http://localhost/api/admin/upload', {
        method: 'POST',
        body: formData1,
      });

      const request2 = new Request('http://localhost/api/admin/upload', {
        method: 'POST',
        body: formData2,
      });

      const response1 = await handleUpload(request1, env);
      const response2 = await handleUpload(request2, env);

      const data1 = await response1.json() as { filename: string };
      const data2 = await response2.json() as { filename: string };

      expect(data1.filename).not.toBe(data2.filename);
    });

    it('should include CORS headers', async () => {
      const formData = new FormData();

      const request = new Request('http://localhost/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await handleUpload(request, env);

      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    });

    it('should return proper URL format', async () => {
      const formData = new FormData();
      const jpegBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]);
      const file = new File([jpegBytes], 'test.jpg', { type: 'image/jpeg' });
      formData.append('file', file);

      const request = new Request('http://localhost/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await handleUpload(request, env);
      const data = await response.json() as { url: string; filename: string };

      expect(data.url).toBe(`https://files.gpeake.com/${data.filename}`);
    });
  });
});
