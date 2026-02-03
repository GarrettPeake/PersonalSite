/**
 * Response Helper Tests
 *
 * Tests for HTTP response utility functions.
 */

import { describe, it, expect } from 'vitest';
import {
  corsHeaders,
  getCorsHeaders,
  jsonResponse,
  htmlResponse,
  handleCorsPreflightResponse,
} from '../../lib/response';

describe('Response Helpers', () => {
  describe('getCorsHeaders', () => {
    it('should not include Access-Control-Allow-Origin when no origin provided', () => {
      const headers = getCorsHeaders();
      expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
    });

    it('should not include Access-Control-Allow-Origin for disallowed origin', () => {
      const headers = getCorsHeaders('https://evil.com');
      expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
    });

    it('should include Access-Control-Allow-Origin for https://gpeake.com', () => {
      const headers = getCorsHeaders('https://gpeake.com');
      expect(headers['Access-Control-Allow-Origin']).toBe('https://gpeake.com');
      expect(headers['Vary']).toBe('Origin');
    });

    it('should include Access-Control-Allow-Origin for https://portfolio.gpeake.com', () => {
      const headers = getCorsHeaders('https://portfolio.gpeake.com');
      expect(headers['Access-Control-Allow-Origin']).toBe('https://portfolio.gpeake.com');
    });

    it('should include Access-Control-Allow-Origin for http://localhost:8787', () => {
      const headers = getCorsHeaders('http://localhost:8787');
      expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:8787');
    });

    it('should have Access-Control-Allow-Methods', () => {
      const headers = getCorsHeaders();
      expect(headers['Access-Control-Allow-Methods']).toContain('GET');
      expect(headers['Access-Control-Allow-Methods']).toContain('POST');
      expect(headers['Access-Control-Allow-Methods']).toContain('PUT');
      expect(headers['Access-Control-Allow-Methods']).toContain('DELETE');
      expect(headers['Access-Control-Allow-Methods']).toContain('OPTIONS');
    });

    it('should have Access-Control-Allow-Headers', () => {
      const headers = getCorsHeaders();
      expect(headers['Access-Control-Allow-Headers']).toContain('Content-Type');
    });

    it('should not include Access-Control-Allow-Origin for null origin', () => {
      const headers = getCorsHeaders(null);
      expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
    });
  });

  describe('corsHeaders (deprecated constant)', () => {
    it('should not include Access-Control-Allow-Origin (no origin context)', () => {
      expect(corsHeaders['Access-Control-Allow-Origin']).toBeUndefined();
    });

    it('should have Access-Control-Allow-Methods', () => {
      expect(corsHeaders['Access-Control-Allow-Methods']).toContain('GET');
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
      const headers = getCorsHeaders('https://gpeake.com');
      const response = jsonResponse({ test: true }, headers);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://gpeake.com');
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
    it('should return response with CORS headers for allowed origin', () => {
      const response = handleCorsPreflightResponse('https://gpeake.com');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://gpeake.com');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBeDefined();
      expect(response.headers.get('Access-Control-Allow-Headers')).toBeDefined();
      expect(response.headers.get('Vary')).toBe('Origin');
    });

    it('should not include Allow-Origin for disallowed origin', () => {
      const response = handleCorsPreflightResponse('https://evil.com');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
      expect(response.headers.get('Access-Control-Allow-Methods')).toBeDefined();
    });

    it('should not include Allow-Origin when no origin provided', () => {
      const response = handleCorsPreflightResponse();
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
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
