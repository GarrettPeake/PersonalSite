/**
 * Tracking Redirect Page Template
 *
 * Minimal HTML page that stores tracking slug and redirects to home.
 */

import { escapeJs } from '../lib/utils';

/**
 * Render the tracking redirect page
 */
export function renderTrackingRedirectPage(slug: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="robots" content="noindex">
  <title>Redirecting...</title>
</head>
<body>
  <script>
    localStorage.setItem('trackingSlug', '${escapeJs(slug)}');
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: '${escapeJs(slug)}',
        page: '/',
        referrer: document.referrer
      })
    }).finally(() => {
      window.location.href = '/';
    });
  </script>
  <noscript>
    <meta http-equiv="refresh" content="0;url=/">
  </noscript>
</body>
</html>`;
}
