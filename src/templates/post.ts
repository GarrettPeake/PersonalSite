/**
 * Blog Post Page Template
 *
 * Renders the full HTML page for blog posts and draft previews.
 */

import { escapeHtml, formatDate } from '../lib/utils';

export interface PostPageOptions {
  title: string;
  content: string;
  publishedAt: string;
  notFound?: boolean;
  isDraft?: boolean;
}

/**
 * Render a blog post or draft preview page
 */
export function renderPostPage(options: PostPageOptions): string {
  const { title, content, publishedAt, notFound, isDraft } = options;

  const dateHtml = publishedAt && !notFound
    ? `<p class="post-meta">${formatDate(publishedAt)}</p>`
    : '';

  const draftBanner = isDraft && !notFound
    ? `<div class="draft-banner">Draft Preview</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${notFound ? '<meta name="robots" content="noindex">' : ''}
  ${isDraft ? '<meta name="robots" content="noindex">' : ''}
  <title>${escapeHtml(title)} | Garrett Peake</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/favicon.ico" sizes="32x32">

  <!-- Styles -->
  <link rel="stylesheet" href="/styles/theme.css">
  <link rel="stylesheet" href="/styles/base.css">
  <link rel="stylesheet" href="/styles/components.css">

  <!-- Prevent FOUC -->
  <script>
    (function() {
      var theme = localStorage.getItem('theme') ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', theme);
    })();
  </script>

  ${!isDraft && !notFound ? `<!-- Desktop SPA redirect -->
  <script>
    (function() {
      if (window.innerWidth >= 900) {
        sessionStorage.setItem('spa-redirect', window.location.pathname);
        window.location.replace('/');
      }
    })();
  </script>` : ''}

  <style>
    .post-meta {
      color: color-mix(in srgb, var(--color-text) 60%, transparent);
      margin-bottom: var(--space-lg);
    }
    .post-content {
      line-height: 1.8;
    }
    .post-content h2, .post-content h3 {
      margin-top: var(--space-xl);
    }
    .post-content pre {
      overflow-x: auto;
    }
    .post-content img {
      max-width: 100%;
      height: auto;
    }
    .post-content blockquote {
      border-left: 4px solid var(--color-primary);
      padding-left: var(--space-md);
      margin: var(--space-md) 0;
      font-style: italic;
    }
    .draft-banner {
      background: var(--color-accent);
      color: var(--color-bg);
      text-align: center;
      padding: var(--space-sm);
      font-weight: bold;
    }
    .back-link {
      display: inline-block;
      margin-bottom: var(--space-lg);
    }
  </style>
</head>
<body class="page">
  <gp-tracker></gp-tracker>
  ${draftBanner}
  <gp-site-header page="blog"></gp-site-header>

  <main class="container">
    <a href="/blog" class="back-link">&larr; Back to blog</a>
    <article>
      <h1>${escapeHtml(title)}</h1>
      ${dateHtml}
      <div class="post-content">
        ${content}
      </div>
    </article>
  </main>

  <gp-site-footer></gp-site-footer>

  <!-- Web Components -->
  <script type="module" src="/components/core/gp-site-header.js"></script>
  <script type="module" src="/components/core/gp-site-footer.js"></script>
  <script type="module" src="/components/tracking/gp-tracker.js"></script>
</body>
</html>`;
}
