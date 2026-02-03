/**
 * HTTP response helpers
 */

/**
 * Allowed CORS origins. Only these origins will receive
 * Access-Control-Allow-Origin headers on API responses.
 */
const ALLOWED_ORIGINS = [
  'https://gpeake.com',
  'https://portfolio.gpeake.com',
  'http://localhost:8787',
];

/**
 * Build CORS headers scoped to the request origin.
 * If the origin is not in the allowlist, Access-Control-Allow-Origin is omitted.
 */
export function getCorsHeaders(origin?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  }
  return headers;
}

/**
 * @deprecated Use getCorsHeaders(origin) instead.
 * Kept as a convenience alias that returns wildcard-free CORS headers
 * without an Allow-Origin value (safe default).
 */
export const corsHeaders = getCorsHeaders();

/**
 * Create a JSON response with optional status and headers
 */
export function jsonResponse(
  data: unknown,
  headers: Record<string, string> = {},
  status = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/**
 * Create an HTML response
 */
export function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html' },
  });
}

/**
 * Handle CORS preflight requests, scoped to the request origin.
 */
export function handleCorsPreflightResponse(origin?: string | null): Response {
  return new Response(null, { headers: getCorsHeaders(origin) });
}
