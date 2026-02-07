/**
 * Shared client-side utility functions
 */

export function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function escapeAttr(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function formatDateLong(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  });
}

export function formatDateShort(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function formatDateTime(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export function sanitizeSvg(svg) {
  if (!svg) return '';

  // Strip dangerous elements
  let sanitized = svg
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<foreignObject[^>]*>.*?<\/foreignObject>/gis, '')
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    .replace(/<a[^>]*>.*?<\/a>/gis, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gis, '')
    .replace(/<embed[^>]*\/?>/gi, '')
    .replace(/<object[^>]*>.*?<\/object>/gis, '');

  // Strip event handler attributes (on*)
  sanitized = sanitized.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\son\w+\s*=\s*[^\s>]*/gi, '');

  // Strip dangerous URLs from href and xlink:href
  sanitized = sanitized.replace(/((?:xlink:)?href)\s*=\s*["'](?:javascript:|data:|vbscript:)[^"']*["']/gi, '');

  return sanitized;
}
