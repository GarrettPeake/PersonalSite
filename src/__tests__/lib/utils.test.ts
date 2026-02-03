/**
 * Utils Tests
 *
 * Tests for shared utility functions.
 */

import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  escapeJs,
  slugify,
  generateRandomSlug,
} from '../../lib/utils';

describe('Utils', () => {
  describe('escapeHtml', () => {
    it('should escape ampersand', () => {
      expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
    });

    it('should escape less than', () => {
      expect(escapeHtml('foo < bar')).toBe('foo &lt; bar');
    });

    it('should escape greater than', () => {
      expect(escapeHtml('foo > bar')).toBe('foo &gt; bar');
    });

    it('should escape double quotes', () => {
      expect(escapeHtml('foo "bar" baz')).toBe('foo &quot;bar&quot; baz');
    });

    it('should escape single quotes', () => {
      expect(escapeHtml("foo 'bar' baz")).toBe('foo &#039;bar&#039; baz');
    });

    it('should escape all special characters', () => {
      expect(escapeHtml('<script>"hello" & \'world\'</script>')).toBe(
        '&lt;script&gt;&quot;hello&quot; &amp; &#039;world&#039;&lt;/script&gt;'
      );
    });

    it('should not modify safe text', () => {
      expect(escapeHtml('Hello World 123')).toBe('Hello World 123');
    });

    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('');
    });
  });

  describe('escapeJs', () => {
    it('should escape backslashes', () => {
      expect(escapeJs('foo\\bar')).toBe('foo\\\\bar');
    });

    it('should escape single quotes', () => {
      expect(escapeJs("foo'bar")).toBe("foo\\'bar");
    });

    it('should escape double quotes', () => {
      expect(escapeJs('foo"bar')).toBe('foo\\"bar');
    });

    it('should escape newlines', () => {
      expect(escapeJs('foo\nbar')).toBe('foo\\nbar');
    });

    it('should escape carriage returns', () => {
      expect(escapeJs('foo\rbar')).toBe('foo\\rbar');
    });

    it('should escape all special characters', () => {
      // Input contains: newline, carriage return, single quote, double quote
      expect(escapeJs("line1\nline2\r'test\"end")).toBe(
        "line1\\nline2\\r\\'test\\\"end"
      );
    });

    it('should not modify safe text', () => {
      expect(escapeJs('Hello World 123')).toBe('Hello World 123');
    });

    it('should handle empty string', () => {
      expect(escapeJs('')).toBe('');
    });
  });

  describe('slugify', () => {
    it('should convert to lowercase', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('should replace spaces with hyphens', () => {
      expect(slugify('foo bar baz')).toBe('foo-bar-baz');
    });

    it('should remove special characters', () => {
      expect(slugify('Hello, World!')).toBe('hello-world');
    });

    it('should handle multiple spaces', () => {
      expect(slugify('foo   bar')).toBe('foo-bar');
    });

    it('should handle underscores', () => {
      expect(slugify('foo_bar_baz')).toBe('foo-bar-baz');
    });

    it('should remove leading hyphens', () => {
      expect(slugify('-foo bar')).toBe('foo-bar');
    });

    it('should remove trailing hyphens', () => {
      expect(slugify('foo bar-')).toBe('foo-bar');
    });

    it('should handle numbers', () => {
      expect(slugify('Blog Post 123')).toBe('blog-post-123');
    });

    it('should handle already valid slug', () => {
      expect(slugify('already-valid-slug')).toBe('already-valid-slug');
    });

    it('should trim whitespace', () => {
      expect(slugify('  foo bar  ')).toBe('foo-bar');
    });

    it('should handle empty string', () => {
      expect(slugify('')).toBe('');
    });

    it('should handle complex titles', () => {
      expect(slugify("What's New in TypeScript 5.0?")).toBe('whats-new-in-typescript-50');
    });
  });

  describe('generateRandomSlug', () => {
    it('should generate slug of specified length', () => {
      const result = generateRandomSlug(5);
      expect(result.length).toBe(5);
    });

    it('should only contain lowercase letters and numbers', () => {
      const result = generateRandomSlug(100);
      expect(result).toMatch(/^[a-z0-9]+$/);
    });

    it('should generate different slugs each time', () => {
      const slug1 = generateRandomSlug(10);
      const slug2 = generateRandomSlug(10);
      const slug3 = generateRandomSlug(10);
      // Very unlikely to be equal
      expect(slug1).not.toBe(slug2);
      expect(slug2).not.toBe(slug3);
    });

    it('should handle length 1', () => {
      const result = generateRandomSlug(1);
      expect(result.length).toBe(1);
    });

    it('should handle length 0', () => {
      const result = generateRandomSlug(0);
      expect(result).toBe('');
    });

    it('should handle large length', () => {
      const result = generateRandomSlug(50);
      expect(result.length).toBe(50);
    });
  });
});
