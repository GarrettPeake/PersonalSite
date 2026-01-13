/**
 * Post Page Template Tests
 *
 * Tests for blog post and draft preview page rendering.
 */

import { describe, it, expect } from 'vitest';
import { renderPostPage } from '../../templates/post';

describe('Post Page Template', () => {
  describe('Basic Structure', () => {
    it('should include DOCTYPE', () => {
      const html = renderPostPage({
        title: 'Test',
        content: 'Content',
        publishedAt: '2024-01-01',
      });
      expect(html).toContain('<!DOCTYPE html>');
    });

    it('should include html lang attribute', () => {
      const html = renderPostPage({
        title: 'Test',
        content: 'Content',
        publishedAt: '2024-01-01',
      });
      expect(html).toContain('lang="en"');
    });

    it('should include viewport meta tag', () => {
      const html = renderPostPage({
        title: 'Test',
        content: 'Content',
        publishedAt: '2024-01-01',
      });
      expect(html).toContain('viewport');
      expect(html).toContain('width=device-width');
    });

    it('should include header component', () => {
      const html = renderPostPage({
        title: 'Test',
        content: 'Content',
        publishedAt: '2024-01-01',
      });
      expect(html).toContain('<gp-header>');
    });

    it('should include footer component', () => {
      const html = renderPostPage({
        title: 'Test',
        content: 'Content',
        publishedAt: '2024-01-01',
      });
      expect(html).toContain('<gp-footer>');
    });

    it('should include tracker component', () => {
      const html = renderPostPage({
        title: 'Test',
        content: 'Content',
        publishedAt: '2024-01-01',
      });
      expect(html).toContain('<gp-tracker>');
    });

    it('should include stylesheet links', () => {
      const html = renderPostPage({
        title: 'Test',
        content: 'Content',
        publishedAt: '2024-01-01',
      });
      expect(html).toContain('/styles/theme.css');
      expect(html).toContain('/styles/base.css');
    });
  });

  describe('Title Rendering', () => {
    it('should include title in h1', () => {
      const html = renderPostPage({
        title: 'My Blog Post',
        content: 'Content',
        publishedAt: '2024-01-01',
      });
      expect(html).toContain('<h1>My Blog Post</h1>');
    });

    it('should include title in page title', () => {
      const html = renderPostPage({
        title: 'My Blog Post',
        content: 'Content',
        publishedAt: '2024-01-01',
      });
      expect(html).toContain('<title>My Blog Post | Garrett Peake</title>');
    });

    it('should escape title for XSS prevention', () => {
      const html = renderPostPage({
        title: '<script>alert("xss")</script>',
        content: 'Content',
        publishedAt: '2024-01-01',
      });
      expect(html).not.toContain('<script>alert("xss")</script>');
      expect(html).toContain('&lt;script&gt;');
    });
  });

  describe('Content Rendering', () => {
    it('should include content in post-content div', () => {
      const html = renderPostPage({
        title: 'Title',
        content: '<p>My rendered content</p>',
        publishedAt: '2024-01-01',
      });
      expect(html).toContain('<div class="post-content">');
      expect(html).toContain('<p>My rendered content</p>');
    });

    it('should not escape pre-rendered HTML content', () => {
      const html = renderPostPage({
        title: 'Title',
        content: '<strong>Bold</strong>',
        publishedAt: '2024-01-01',
      });
      expect(html).toContain('<strong>Bold</strong>');
    });
  });

  describe('Date Rendering', () => {
    it('should include formatted date', () => {
      const html = renderPostPage({
        title: 'Title',
        content: 'Content',
        publishedAt: '2024-03-15T10:00:00Z',
      });
      expect(html).toContain('post-meta');
      expect(html).toContain('March 15, 2024');
    });

    it('should not show date when publishedAt is empty', () => {
      const html = renderPostPage({
        title: 'Title',
        content: 'Content',
        publishedAt: '',
      });
      // CSS still includes .post-meta class, but the <p> element should not be rendered
      expect(html).not.toContain('<p class="post-meta">');
    });

    it('should not show date for notFound page', () => {
      const html = renderPostPage({
        title: 'Not Found',
        content: 'Content',
        publishedAt: '2024-01-01',
        notFound: true,
      });
      // CSS still includes .post-meta class, but the <p> element should not be rendered
      expect(html).not.toContain('<p class="post-meta">');
    });
  });

  describe('Draft Banner', () => {
    it('should show draft banner for drafts', () => {
      const html = renderPostPage({
        title: 'Draft Post',
        content: 'Content',
        publishedAt: '2024-01-01',
        isDraft: true,
      });
      expect(html).toContain('draft-banner');
      expect(html).toContain('Draft Preview');
    });

    it('should not show draft banner for published posts', () => {
      const html = renderPostPage({
        title: 'Published Post',
        content: 'Content',
        publishedAt: '2024-01-01',
      });
      // CSS still includes .draft-banner class, but the <div> element should not be rendered
      expect(html).not.toContain('<div class="draft-banner">');
    });

    it('should not show draft banner for notFound draft', () => {
      const html = renderPostPage({
        title: 'Not Found',
        content: 'Content',
        publishedAt: '',
        isDraft: true,
        notFound: true,
      });
      expect(html).not.toContain('Draft Preview');
    });
  });

  describe('NotFound State', () => {
    it('should include noindex for notFound', () => {
      const html = renderPostPage({
        title: 'Not Found',
        content: 'Content',
        publishedAt: '',
        notFound: true,
      });
      expect(html).toContain('noindex');
    });

    it('should include noindex for drafts', () => {
      const html = renderPostPage({
        title: 'Draft',
        content: 'Content',
        publishedAt: '2024-01-01',
        isDraft: true,
      });
      expect(html).toContain('noindex');
    });
  });

  describe('Navigation', () => {
    it('should include back to blog link', () => {
      const html = renderPostPage({
        title: 'Post',
        content: 'Content',
        publishedAt: '2024-01-01',
      });
      expect(html).toContain('href="/blog"');
      expect(html).toContain('Back to blog');
    });
  });

  describe('Styling', () => {
    it('should include inline styles', () => {
      const html = renderPostPage({
        title: 'Post',
        content: 'Content',
        publishedAt: '2024-01-01',
      });
      expect(html).toContain('<style>');
      expect(html).toContain('.post-content');
    });

    it('should include container class', () => {
      const html = renderPostPage({
        title: 'Post',
        content: 'Content',
        publishedAt: '2024-01-01',
      });
      expect(html).toContain('class="container"');
    });
  });
});
