/**
 * Blog Post Section Module
 *
 * Renders a full blog post inline (used on mobile).
 * Desktop uses the blog modal instead.
 */

import { escapeHtml, formatDateLong as formatDate } from '/js/utils.js';

const template = `
  <div class="blog-post-section">
    <div class="blog-post-content">
      <p class="loading">Loading post...</p>
    </div>
  </div>
`;

async function init(container, params = {}) {
  const { slug } = params;
  const content = container.querySelector('.blog-post-content');

  if (!slug) {
    content.innerHTML = '<p class="empty">Post not found.</p>';
    return;
  }

  try {
    const response = await fetch(`/api/posts/${slug}`);
    if (!response.ok) throw new Error('Post not found');

    const post = await response.json();
    const rendered = window.renderMarkdown ? window.renderMarkdown(post.content) : escapeHtml(post.content);

    content.innerHTML = `
      <a href="/blog" class="back-link" data-spa-link>&larr; Back to blog</a>
      <article class="post-article">
        <h2 class="post-title">${escapeHtml(post.title)}</h2>
        <p class="post-meta">${formatDate(post.publishedAt)}</p>
        <div class="md-content">${rendered}</div>
      </article>
    `;

    document.title = `${post.title} | Garrett Peake`;
  } catch (error) {
    content.innerHTML = `
      <a href="/blog" class="back-link" data-spa-link>&larr; Back to blog</a>
      <div class="not-found-content">
        <p class="not-found-code">404</p>
        <h2 class="not-found-title">Post not found</h2>
        <p class="not-found-message">The post you are looking for does not exist or has been removed.</p>
      </div>
    `;
  }
}

export default {
  template,
  init
};
