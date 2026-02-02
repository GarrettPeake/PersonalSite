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
