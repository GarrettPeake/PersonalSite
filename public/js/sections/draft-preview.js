/**
 * Draft Preview Section Module
 *
 * Renders a draft preview using the public share token API.
 * Works on both desktop and mobile layouts.
 */

import { escapeHtml, formatDateLong as formatDate } from '/js/utils.js';

const template = `
  <div class="draft-preview-section">
    <div class="draft-preview-content">
      <p class="loading">Loading draft...</p>
    </div>
  </div>
`;

async function init(container, params = {}) {
  const { token } = params;
  const content = container.querySelector('.draft-preview-content');

  if (!token) {
    content.innerHTML = '<p class="empty">Invalid draft link.</p>';
    return;
  }

  try {
    const response = await fetch(`/api/draft/share/${token}`);
    if (!response.ok) throw new Error('Draft not found');

    const draft = await response.json();
    const rendered = window.renderMarkdown ? window.renderMarkdown(draft.content) : escapeHtml(draft.content);

    content.innerHTML = `
      <div class="draft-banner">Draft Preview</div>
      <article class="post-article">
        <h2 class="post-title">${escapeHtml(draft.title)}</h2>
        <p class="post-meta">${formatDate(draft.updatedAt || draft.createdAt)}</p>
        <div class="md-content">${rendered}</div>
      </article>
    `;

    document.title = `${draft.title} (Draft) | Garrett Peake`;
  } catch (error) {
    content.innerHTML = `
      <div class="not-found-content">
        <p class="not-found-code">404</p>
        <h2 class="not-found-title">Draft not found</h2>
        <p class="not-found-message">This draft link is invalid or has been revoked.</p>
        <a href="/" class="btn btn--primary" data-spa-link>Back to home</a>
      </div>
    `;
  }
}

export default {
  template,
  init
};
