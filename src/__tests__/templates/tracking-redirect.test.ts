/**
 * Tracking Redirect Page Template Tests
 *
 * Tests for tracking redirect page rendering.
 */

import { describe, it, expect } from 'vitest';
import { renderTrackingRedirectPage } from '../../templates/tracking-redirect';

describe('Tracking Redirect Page Template', () => {
  describe('Basic Structure', () => {
    it('should include DOCTYPE', () => {
      const html = renderTrackingRedirectPage('test');
      expect(html).toContain('<!DOCTYPE html>');
    });

    it('should include charset meta tag', () => {
      const html = renderTrackingRedirectPage('test');
      expect(html).toContain('charset="utf-8"');
    });

    it('should include noindex meta tag', () => {
      const html = renderTrackingRedirectPage('test');
      expect(html).toContain('noindex');
    });

    it('should include redirecting title', () => {
      const html = renderTrackingRedirectPage('test');
      expect(html).toContain('<title>Redirecting...</title>');
    });
  });

  describe('LocalStorage Tracking', () => {
    it('should set trackingSlug in localStorage', () => {
      const html = renderTrackingRedirectPage('myslug');
      expect(html).toContain("localStorage.setItem('trackingSlug', 'myslug')");
    });

    it('should include correct slug in localStorage call', () => {
      const html = renderTrackingRedirectPage('fb123');
      expect(html).toContain("'fb123'");
    });
  });

  describe('API Tracking Call', () => {
    it('should include fetch call to /api/track', () => {
      const html = renderTrackingRedirectPage('test');
      expect(html).toContain("fetch('/api/track'");
    });

    it('should use POST method', () => {
      const html = renderTrackingRedirectPage('test');
      expect(html).toContain("method: 'POST'");
    });

    it('should include Content-Type header', () => {
      const html = renderTrackingRedirectPage('test');
      expect(html).toContain("'Content-Type': 'application/json'");
    });

    it('should include slug in request body', () => {
      const html = renderTrackingRedirectPage('myslug');
      expect(html).toContain("slug: 'myslug'");
    });

    it('should include page: "/" in request body', () => {
      const html = renderTrackingRedirectPage('test');
      expect(html).toContain("page: '/'");
    });

    it('should include document.referrer', () => {
      const html = renderTrackingRedirectPage('test');
      expect(html).toContain('referrer: document.referrer');
    });
  });

  describe('Redirect Behavior', () => {
    it('should redirect to home after fetch', () => {
      const html = renderTrackingRedirectPage('test');
      expect(html).toContain("window.location.href = '/'");
    });

    it('should use finally for redirect', () => {
      const html = renderTrackingRedirectPage('test');
      expect(html).toContain('.finally(');
    });
  });

  describe('Noscript Fallback', () => {
    it('should include noscript tag', () => {
      const html = renderTrackingRedirectPage('test');
      expect(html).toContain('<noscript>');
      expect(html).toContain('</noscript>');
    });

    it('should include meta refresh in noscript', () => {
      const html = renderTrackingRedirectPage('test');
      expect(html).toContain('http-equiv="refresh"');
      expect(html).toContain('content="0;url=/"');
    });
  });

  describe('XSS Prevention', () => {
    it('should escape slug with single quotes', () => {
      const html = renderTrackingRedirectPage("test'slug");
      expect(html).not.toContain("'test'slug'");
      expect(html).toContain("\\'");
    });

    it('should escape slug with backslashes', () => {
      const html = renderTrackingRedirectPage('test\\slug');
      expect(html).toContain('\\\\');
    });

    it('should escape slug with newlines', () => {
      const html = renderTrackingRedirectPage('test\nslug');
      expect(html).toContain('\\n');
    });

    it('should handle normal alphanumeric slugs', () => {
      const html = renderTrackingRedirectPage('abc123');
      expect(html).toContain("'abc123'");
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty slug', () => {
      const html = renderTrackingRedirectPage('');
      expect(html).toContain("localStorage.setItem('trackingSlug', '')");
    });

    it('should handle slug with numbers only', () => {
      const html = renderTrackingRedirectPage('12345');
      expect(html).toContain("'12345'");
    });

    it('should handle slug with uppercase', () => {
      const html = renderTrackingRedirectPage('AbCdE');
      expect(html).toContain("'AbCdE'");
    });
  });
});
