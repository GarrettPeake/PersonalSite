/**
 * Blog Page Handler Tests
 *
 * Tests for blog post page rendering.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { env } from 'cloudflare:test';
import { handleBlogPost } from '../../../handlers/pages/blog';
import { createDraft } from '../../../dao/draft.dao';
import { publishDraft } from '../../../dao/post.dao';
import { KV_PREFIX } from '../../../types';

// Mock ASSETS.fetch
const mockAssetsFetch = vi.fn(() => Promise.resolve(new Response('static asset')));

describe('Blog Page Handler', () => {
  let testEnv: typeof env & { ASSETS: { fetch: typeof mockAssetsFetch } };

  beforeEach(async () => {
    // Clean up
    const prefixes = [KV_PREFIX.POST, KV_PREFIX.POST_SLUG, KV_PREFIX.DRAFT];
    for (const prefix of prefixes) {
      const keys = await env.KV.list({ prefix });
      for (const key of keys.keys) {
        await env.KV.delete(key.name);
      }
    }
    await env.KV.delete(KV_PREFIX.INDEX_POSTS);
    await env.KV.delete(KV_PREFIX.INDEX_DRAFTS);

    testEnv = {
      ...env,
      ASSETS: { fetch: mockAssetsFetch },
    } as typeof env & { ASSETS: { fetch: typeof mockAssetsFetch } };

    mockAssetsFetch.mockClear();
  });

  it('should return 404 for non-existent post', async () => {
    const request = new Request('http://localhost/blog/non-existent');
    const response = await handleBlogPost(request, testEnv, '/blog/non-existent');

    expect(response.status).toBe(404);
    const html = await response.text();
    expect(html).toContain('Post Not Found');
  });

  it('should render post with content', async () => {
    const draft = await createDraft(testEnv.KV, {
      title: 'My Blog Post',
      slug: 'my-blog-post',
      content: 'This is the **blog** content.',
    });
    await publishDraft(testEnv.KV, draft.id);

    const request = new Request('http://localhost/blog/my-blog-post');
    const response = await handleBlogPost(request, testEnv, '/blog/my-blog-post');

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('My Blog Post');
    expect(html).toContain('<strong>blog</strong>');
  });

  it('should render HTML content type', async () => {
    const draft = await createDraft(testEnv.KV, {
      title: 'Post',
      slug: 'post',
      content: 'Content',
    });
    await publishDraft(testEnv.KV, draft.id);

    const request = new Request('http://localhost/blog/post');
    const response = await handleBlogPost(request, testEnv, '/blog/post');

    expect(response.headers.get('Content-Type')).toBe('text/html');
  });

  it('should include page structure', async () => {
    const draft = await createDraft(testEnv.KV, {
      title: 'Post',
      slug: 'post',
      content: 'Content',
    });
    await publishDraft(testEnv.KV, draft.id);

    const request = new Request('http://localhost/blog/post');
    const response = await handleBlogPost(request, testEnv, '/blog/post');

    const html = await response.text();
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<gp-site-header');
    expect(html).toContain('<gp-site-footer>');
    expect(html).toContain('Back to blog');
  });

  it('should include formatted date', async () => {
    const draft = await createDraft(testEnv.KV, {
      title: 'Post',
      slug: 'post',
      content: 'Content',
    });
    await publishDraft(testEnv.KV, draft.id);

    const request = new Request('http://localhost/blog/post');
    const response = await handleBlogPost(request, testEnv, '/blog/post');

    const html = await response.text();
    expect(html).toContain('post-meta');
  });

  it('should not show draft banner for published post', async () => {
    const draft = await createDraft(testEnv.KV, {
      title: 'Post',
      slug: 'post',
      content: 'Content',
    });
    await publishDraft(testEnv.KV, draft.id);

    const request = new Request('http://localhost/blog/post');
    const response = await handleBlogPost(request, testEnv, '/blog/post');

    const html = await response.text();
    // CSS still includes .draft-banner class, but the <div> element should not be rendered
    expect(html).not.toContain('<div class="draft-banner">');
  });

  it('should escape title for XSS prevention', async () => {
    const draft = await createDraft(testEnv.KV, {
      title: '<script>alert("xss")</script>',
      slug: 'xss-test',
      content: 'Content',
    });
    await publishDraft(testEnv.KV, draft.id);

    const request = new Request('http://localhost/blog/xss-test');
    const response = await handleBlogPost(request, testEnv, '/blog/xss-test');

    const html = await response.text();
    expect(html).not.toContain('<script>alert("xss")</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('should render markdown with macros', async () => {
    const draft = await createDraft(testEnv.KV, {
      title: 'Post with Macro',
      slug: 'macro-post',
      content: '/Banner(200px, Hello, Welcome, #ff6b00)',
    });
    await publishDraft(testEnv.KV, draft.id);

    const request = new Request('http://localhost/blog/macro-post');
    const response = await handleBlogPost(request, testEnv, '/blog/macro-post');

    const html = await response.text();
    expect(html).toContain('macro-banner');
  });

  it('should delegate to ASSETS for empty slug', async () => {
    const request = new Request('http://localhost/blog/');
    await handleBlogPost(request, testEnv, '/blog/');

    expect(mockAssetsFetch).toHaveBeenCalled();
  });

  it('should handle posts with code blocks', async () => {
    const draft = await createDraft(testEnv.KV, {
      title: 'Code Post',
      slug: 'code-post',
      content: '```javascript\nconst x = 1;\n```',
    });
    await publishDraft(testEnv.KV, draft.id);

    const request = new Request('http://localhost/blog/code-post');
    const response = await handleBlogPost(request, testEnv, '/blog/code-post');

    const html = await response.text();
    expect(html).toContain('<pre><code');
    expect(html).toContain('const x = 1;');
  });
});
