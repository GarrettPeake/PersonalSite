/**
 * 404 Not Found page template
 *
 * Returns a styled HTML page consistent with the site's neo-brutalist design.
 */

export function notFoundPage(path: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>404 - Page Not Found | gpeake.com</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/favicon.ico" sizes="32x32">
  <link rel="stylesheet" href="/styles/theme.css">
  <link rel="stylesheet" href="/styles/base.css">
  <link rel="stylesheet" href="/styles/components.css">
  <style>
    .not-found {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      text-align: center;
      padding: var(--space-xl) var(--space-md);
    }
    .not-found__code {
      font-family: var(--font-display);
      font-size: clamp(6rem, 15vw, 12rem);
      font-weight: 700;
      line-height: 1;
      color: var(--color-primary);
      margin: 0;
    }
    .not-found__title {
      font-family: var(--font-display);
      font-size: clamp(1.25rem, 3vw, 2rem);
      font-weight: 600;
      margin: var(--space-sm) 0 var(--space-md);
    }
    .not-found__message {
      color: var(--color-text-muted);
      margin: 0 0 var(--space-lg);
      max-width: 36ch;
    }
    .not-found__path {
      font-family: var(--font-mono);
      font-size: 0.875rem;
      color: var(--color-text-muted);
      background: var(--color-bg-secondary);
      border: var(--border-thin) solid var(--color-border);
      padding: var(--space-xs) var(--space-sm);
      margin-bottom: var(--space-lg);
      word-break: break-all;
    }
  </style>
</head>
<body class="page">
  <main class="not-found">
    <p class="not-found__code">404</p>
    <h1 class="not-found__title">Page not found</h1>
    <p class="not-found__path">${escapeHtml(path)}</p>
    <p class="not-found__message">The page you are looking for does not exist or has been moved.</p>
    <a href="/" class="btn btn--primary">Back to home</a>
  </main>
  <script>
    // Apply saved theme
    const t = localStorage.getItem('theme');
    if (t) document.documentElement.setAttribute('data-theme', t);
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
