/**
 * Not Found Page Template Tests
 *
 * Tests for the 404 page rendering.
 */

import { describe, it, expect } from 'vitest';
import { notFoundPage } from '../../templates/not-found';

describe('Not Found Page Template', () => {
  it('should include DOCTYPE and basic HTML structure', () => {
    const html = notFoundPage('/nonexistent');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('lang="en"');
    expect(html).toContain('<title>404 - Page Not Found | gpeake.com</title>');
  });

  it('should include the requested path', () => {
    const html = notFoundPage('/some/random/path');
    expect(html).toContain('/some/random/path');
  });

  it('should escape HTML in the path', () => {
    const html = notFoundPage('/<script>alert("xss")</script>');
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
  });

  it('should include a link back to the homepage', () => {
    const html = notFoundPage('/missing');
    expect(html).toContain('href="/"');
    expect(html).toContain('Back to home');
  });

  it('should include theme CSS', () => {
    const html = notFoundPage('/missing');
    expect(html).toContain('/styles/theme.css');
    expect(html).toContain('/styles/base.css');
    expect(html).toContain('/styles/components.css');
  });

  it('should include 404 heading', () => {
    const html = notFoundPage('/missing');
    expect(html).toContain('404');
    expect(html).toContain('Page not found');
  });

  it('should include theme restoration script', () => {
    const html = notFoundPage('/missing');
    expect(html).toContain('localStorage.getItem');
    expect(html).toContain('data-theme');
  });
});
