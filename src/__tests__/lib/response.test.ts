/**
 * Response Helper Tests
 *
 * Tests for HTTP response utility functions.
 */

import { describe, it, expect } from 'vitest';
import {
  corsHeaders,
  jsonResponse,
  htmlResponse,
  handleCorsPreflightResponse,
} from '../../lib/response';

describe('Response Helpers', () => {
  describe('corsHeaders', () => {
    it('should have Access-Control-Allow-Origin', () => {
      expect(corsHeaders['Access-Control-Allow-Origin']).toBe('*');
    });

    it('should have Access-Control-Allow-Methods', () => {
      expect(corsHeaders['Access-Control-Allow-Methods']).toContain('GET');
      expect(corsHeaders['Access-Control-Allow-Methods']).toContain('POST');
      expect(corsHeaders['Access-Control-Allow-Methods']).toContain('PUT');
      expect(corsHeaders['Access-Control-Allow-Methods']).toContain('DELETE');
      expect(corsHeaders['Access-Control-Allow-Methods']).toContain('OPTIONS');
    });

    it('should have Access-Control-Allow-Headers', () => {
      expect(corsHeaders['Access-Control-Allow-Headers']).toContain('Content-Type');
    });
  });

  describe('jsonResponse', () => {
    it('should create response with JSON body', async () => {
      const response = jsonResponse({ message: 'hello' });
      const body = await response.json();
      expect(body).toEqual({ message: 'hello' });
    });

    it('should set Content-Type to application/json', () => {
      const response = jsonResponse({ test: true });
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('should default to status 200', () => {
      const response = jsonResponse({ test: true });
      expect(response.status).toBe(200);
    });

    it('should use custom status code', () => {
      const response = jsonResponse({ error: 'Not found' }, {}, 404);
      expect(response.status).toBe(404);
    });

    it('should merge custom headers', () => {
      const response = jsonResponse({ test: true }, { 'X-Custom': 'value' });
      expect(response.headers.get('X-Custom')).toBe('value');
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('should serialize arrays', async () => {
      const response = jsonResponse([1, 2, 3]);
      const body = await response.json();
      expect(body).toEqual([1, 2, 3]);
    });

    it('should serialize null', async () => {
      const response = jsonResponse(null);
      const body = await response.json();
      expect(body).toBeNull();
    });

    it('should serialize nested objects', async () => {
      const data = { user: { name: 'Test', roles: ['admin', 'user'] } };
      const response = jsonResponse(data);
      const body = await response.json();
      expect(body).toEqual(data);
    });

    it('should include CORS headers when provided', () => {
      const response = jsonResponse({ test: true }, corsHeaders);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });

  describe('htmlResponse', () => {
    it('should create response with HTML body', async () => {
      const response = htmlResponse('<h1>Hello</h1>');
      const body = await response.text();
      expect(body).toBe('<h1>Hello</h1>');
    });

    it('should set Content-Type to text/html', () => {
      const response = htmlResponse('<p>Test</p>');
      expect(response.headers.get('Content-Type')).toBe('text/html');
    });

    it('should default to status 200', () => {
      const response = htmlResponse('<p>Test</p>');
      expect(response.status).toBe(200);
    });

    it('should use custom status code', () => {
      const response = htmlResponse('<p>Not Found</p>', 404);
      expect(response.status).toBe(404);
    });

    it('should handle empty HTML', async () => {
      const response = htmlResponse('');
      const body = await response.text();
      expect(body).toBe('');
    });

    it('should handle full HTML document', async () => {
      const html = '<!DOCTYPE html><html><body>Test</body></html>';
      const response = htmlResponse(html);
      const body = await response.text();
      expect(body).toBe(html);
    });
  });

  describe('handleCorsPreflightResponse', () => {
    it('should return response with CORS headers', () => {
      const response = handleCorsPreflightResponse();
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBeDefined();
      expect(response.headers.get('Access-Control-Allow-Headers')).toBeDefined();
    });

    it('should have null body', async () => {
      const response = handleCorsPreflightResponse();
      const body = await response.text();
      expect(body).toBe('');
    });

    it('should have default status 200', () => {
      const response = handleCorsPreflightResponse();
      expect(response.status).toBe(200);
    });
  });
});
