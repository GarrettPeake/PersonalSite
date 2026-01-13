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
  <link rel="stylesheet" href="/styles/theme.css">
  <link rel="stylesheet" href="/styles/base.css">
  <script type="module" src="/components/core/gp-theme-toggle.js"></script>
  <script type="module" src="/components/core/gp-header.js"></script>
  <script type="module" src="/components/core/gp-footer.js"></script>
  <script type="module" src="/components/tracking/gp-tracker.js"></script>
  <style>
    body {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
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
<body>
  <gp-tracker></gp-tracker>
  ${draftBanner}
  <gp-header></gp-header>

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

  <gp-footer></gp-footer>
</body>
</html>`;
}
