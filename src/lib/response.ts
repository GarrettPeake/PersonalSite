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

/**
 * Add security headers to a response.
 *
 * Applied at the Worker level so every response (API, SPA shell, assets,
 * admin pages, redirects) gets a consistent set of hardening headers.
 */
export function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (!headers.has('Strict-Transport-Security')) {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https://files.gpeake.com data:; media-src 'self' https://files.gpeake.com; frame-src 'self' https:; connect-src 'self'; base-uri 'self'; form-action 'self'"
  );
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Check whether a request body exceeds the given size limit
 * by inspecting the Content-Length header.
 * Returns true if the body is too large, false otherwise.
 * If no Content-Length header is present, returns false (chunked transfers).
 */
export function isBodyTooLarge(request: Request, maxBytes: number = 1_048_576): boolean {
  const contentLength = request.headers.get('Content-Length');
  if (contentLength !== null) {
    const size = parseInt(contentLength, 10);
    if (!isNaN(size) && size > maxBytes) {
      return true;
    }
  }
  return false;
}

/**
 * Safely parse JSON body from a request.
 * Returns null if the body cannot be parsed as JSON or exceeds size limit (1MB default).
 */
export async function parseJsonBody<T = unknown>(request: Request): Promise<T | null> {
  try {
    if (isBodyTooLarge(request)) {
      return null;
    }
    return await request.json() as T;
  } catch {
    return null;
  }
}

/**
 * Check whether the request has a Content-Type that includes application/json.
 *
 * Requiring application/json provides CSRF protection because browsers will
 * not send cross-origin requests with this Content-Type without triggering
 * a CORS preflight, which effectively blocks cross-site form submissions.
 */
export function requireJsonContentType(request: Request): Response | null {
  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.includes('application/json')) {
    return jsonResponse(
      { error: 'Content-Type must be application/json' },
      corsHeaders,
      400,
    );
  }
  return null;
}
