/**
 * Blog Section Module
 *
 * Displays blog post list within the SPA.
 * Desktop: click opens modal.
 * Mobile: click navigates to inline blog post section.
 */

import { openBlogPost, navigate, getLayoutMode } from '/js/spa/router.js';

const template = `
  <div class="blog-section">
    <div class="blog-section-content">
      <section class="posts" id="spa-posts">
        <p class="loading">Loading posts...</p>
      </section>
    </div>
  </div>
`;

async function init(container) {
  const postsContainer = container.querySelector('#spa-posts');

  try {
    const response = await fetch('/api/posts');
    if (!response.ok) throw new Error('Failed to fetch posts');

    const posts = await response.json();

    if (posts.length === 0) {
      postsContainer.innerHTML = '<p class="empty">No posts yet. Check back soon!</p>';
      return;
    }

    postsContainer.innerHTML = posts.map(post => `
      <article class="post-card" data-slug="${escapeAttr(post.slug)}">
        <h2><a href="/blog/${escapeAttr(post.slug)}" data-spa-post="${escapeAttr(post.slug)}">${escapeHtml(post.title)}</a></h2>
        <p class="post-meta">${formatDate(post.publishedAt)}</p>
        ${post.description ? `<p class="post-excerpt">${escapeHtml(post.description)}</p>` : ''}
      </article>
    `).join('');

    // Setup click handlers for SPA navigation
    setupPostClicks(container);
  } catch (error) {
    postsContainer.innerHTML = '<p class="empty">No posts yet. Check back soon!</p>';
  }
}

function setupPostClicks(container) {
  container.addEventListener('click', (e) => {
    const link = e.target.closest('[data-spa-post]');
    if (!link) return;

    e.preventDefault();
    const slug = link.dataset.spaPost;

    if (getLayoutMode() === 'desktop') {
      openBlogPost(slug);
    } else {
      navigate(`/blog/${slug}`);
    }
  });
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  });
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default {
  template,
  init
};
