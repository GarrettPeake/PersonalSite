/**
 * Sitemap Handler
 *
 * Generates a dynamic sitemap.xml that includes static public pages
 * and all published blog posts.
 */

import { Env } from '../../types';
import { listPosts } from '../../dao/post.dao';

const DOMAIN = 'https://gpeake.com';

const STATIC_PAGES = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/about', priority: '0.8', changefreq: 'monthly' },
  { path: '/blog', priority: '0.9', changefreq: 'weekly' },
  { path: '/photography', priority: '0.7', changefreq: 'weekly' },
  { path: '/projects', priority: '0.8', changefreq: 'monthly' },
];

/**
 * Handle GET /sitemap.xml
 */
export async function handleSitemap(env: Env): Promise<Response> {
  const posts = await listPosts(env.KV);

  const staticEntries = STATIC_PAGES.map(
    (page) => `  <url>
    <loc>${DOMAIN}${page.path}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  ).join('\n');

  const postEntries = posts.map(
    (post) => `  <url>
    <loc>${DOMAIN}/blog/${post.slug}</loc>
    <lastmod>${post.updatedAt.split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`
  ).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticEntries}
${postEntries}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
