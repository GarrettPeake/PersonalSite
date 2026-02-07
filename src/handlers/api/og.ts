/**
 * OpenGraph Metadata Fetch Handler
 *
 * GET /api/admin/og?url=... - Fetches OpenGraph metadata for link previews.
 */

import { jsonResponse, corsHeaders } from '../../lib/response';

interface OgData {
  title: string;
  description: string;
  image: string;
  url: string;
}

/**
 * Check if a URL targets a private/internal network address.
 * Blocks localhost, private IP ranges, link-local, and cloud metadata endpoints.
 */
function isPrivateUrl(urlString: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return true; // Invalid URLs are blocked
  }

  // Only allow http and https schemes
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return true;
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname === '::1') {
    return true;
  }

  // Block cloud metadata service
  if (hostname === '169.254.169.254') {
    return true;
  }

  // Check if hostname is an IP address and block private ranges
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);
    // 10.0.0.0/8
    if (a === 10) return true;
    // 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16
    if (a === 192 && b === 168) return true;
    // 169.254.0.0/16 (link-local)
    if (a === 169 && b === 254) return true;
    // 0.0.0.0/8
    if (a === 0) return true;
  }

  // Block IPv6 loopback and link-local (bracket notation in URLs)
  if (hostname.startsWith('[')) {
    const inner = hostname.slice(1, -1).toLowerCase();
    if (inner === '::1' || inner.startsWith('fe80:') || inner.startsWith('fc') || inner.startsWith('fd')) {
      return true;
    }
  }

  return false;
}

/**
 * GET /api/admin/og?url=... - Fetch OpenGraph metadata from a URL
 */
export async function handleOgFetch(request: Request): Promise<Response> {
  const url = new URL(request.url).searchParams.get('url');

  if (!url) {
    return jsonResponse({ error: 'Missing url parameter' }, corsHeaders, 400);
  }

  try {
    new URL(url);
  } catch {
    return jsonResponse({ error: 'Invalid URL' }, corsHeaders, 400);
  }

  // SSRF protection: block private/internal URLs
  if (isPrivateUrl(url)) {
    return jsonResponse({ error: 'URL not allowed' }, corsHeaders, 400);
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GPeakeBot/1.0)',
        Accept: 'text/html',
      },
      redirect: 'follow',
    });

    if (!res.ok) {
      return jsonResponse({ error: 'Failed to fetch URL' }, corsHeaders, 502);
    }

    const html = await res.text();
    const og = parseOgTags(html, url);
    return jsonResponse(og, corsHeaders);
  } catch {
    return jsonResponse({ error: 'Failed to fetch URL' }, corsHeaders, 502);
  }
}

function parseOgTags(html: string, fallbackUrl: string): OgData {
  const get = (property: string): string => {
    // Try og: tags first
    const ogMatch = html.match(
      new RegExp(`<meta[^>]+property=["']og:${property}["'][^>]+content=["']([^"']+)["']`, 'i')
    ) || html.match(
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${property}["']`, 'i')
    );
    if (ogMatch) return ogMatch[1];

    // Fallback to twitter: tags
    const twMatch = html.match(
      new RegExp(`<meta[^>]+name=["']twitter:${property}["'][^>]+content=["']([^"']+)["']`, 'i')
    ) || html.match(
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:${property}["']`, 'i')
    );
    if (twMatch) return twMatch[1];

    return '';
  };

  // Fallback title from <title> tag
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const fallbackTitle = titleMatch ? titleMatch[1].trim() : '';

  // Fallback description from meta description
  const descMatch = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i
  ) || html.match(
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i
  );
  const fallbackDesc = descMatch ? descMatch[1] : '';

  return {
    title: get('title') || fallbackTitle,
    description: get('description') || fallbackDesc,
    image: get('image'),
    url: get('url') || fallbackUrl,
  };
}
