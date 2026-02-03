/**
 * File Upload API Handler Tests
 *
 * Tests for file upload endpoint.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { handleUpload } from '../../../handlers/api/upload';

describe('Upload API Handler', () => {
  beforeEach(async () => {
    // Clean up R2 bucket
    const objects = await env.R2.list();
    for (const obj of objects.objects) {
      await env.R2.delete(obj.key);
    }
  });

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
      const file = new File(['png content'], 'test.png', { type: 'image/png' });
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
      const file = new File(['gif content'], 'test.gif', { type: 'image/gif' });
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
      const file = new File(['webp content'], 'test.webp', { type: 'image/webp' });
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

    it('should upload SVG image successfully', async () => {
      const formData = new FormData();
      const file = new File(['<svg></svg>'], 'test.svg', { type: 'image/svg+xml' });
      formData.append('file', file);

      const request = new Request('http://localhost/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await handleUpload(request, env);

      expect(response.status).toBe(200);
      const data = await response.json() as { filename: string };
      expect(data.filename).toContain('.svg');
    });

    it('should upload PDF successfully', async () => {
      const formData = new FormData();
      const file = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
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

    it('should store file in R2', async () => {
      const formData = new FormData();
      const content = 'test image content';
      const file = new File([content], 'test.jpg', { type: 'image/jpeg' });
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

      const storedContent = await stored!.text();
      expect(storedContent).toBe(content);
    });

    it('should set correct content type in R2', async () => {
      const formData = new FormData();
      const file = new File(['content'], 'test.png', { type: 'image/png' });
      formData.append('file', file);

      const request = new Request('http://localhost/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await handleUpload(request, env);
      const data = await response.json() as { filename: string };

      const stored = await env.R2.get(data.filename);
      expect(stored!.httpMetadata?.contentType).toBe('image/png');
    });

    it('should generate unique filenames', async () => {
      const formData1 = new FormData();
      const file1 = new File(['content1'], 'same.jpg', { type: 'image/jpeg' });
      formData1.append('file', file1);

      const formData2 = new FormData();
      const file2 = new File(['content2'], 'same.jpg', { type: 'image/jpeg' });
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
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
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
