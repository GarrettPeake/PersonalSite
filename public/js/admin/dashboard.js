// Admin Dashboard Page JavaScript

import { escapeHtml, formatDateShort as formatDate } from '/js/utils.js';

// Logout handler
document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/admin/login';
});

// Load dashboard data
async function loadDashboard() {
  try {
    const [draftsRes, postsRes, trackingRes] = await Promise.all([
      fetch('/api/admin/drafts'),
      fetch('/api/admin/posts'),
      fetch('/api/admin/tracking'),
    ]);

    if (!draftsRes.ok || !postsRes.ok || !trackingRes.ok) {
      // Probably not authenticated
      window.location.href = '/admin/login';
      return;
    }

    const drafts = await draftsRes.json();
    const posts = await postsRes.json();
    const tracking = await trackingRes.json();

    // Update stats
    document.getElementById('post-count').textContent = posts.length;
    document.getElementById('draft-count').textContent = drafts.length;
    document.getElementById('tracking-count').textContent = tracking.length;

    // Sort drafts by updated date descending
    drafts.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    // Render recent drafts
    const draftsContainer = document.getElementById('recent-drafts');
    if (drafts.length === 0) {
      draftsContainer.innerHTML = '<p class="empty">No drafts yet. <a href="/admin/editor">Create your first draft</a></p>';
    } else {
      draftsContainer.innerHTML = drafts.slice(0, 5).map(d => `
        <a href="/admin/editor?draft=${d.id}" class="item-row item-row--link">
          <span class="item-title">${d.title ? escapeHtml(d.title) : '<span class="untitled">Untitled</span>'}</span>
          <span class="item-date">${formatDate(d.updatedAt)}</span>
        </a>
      `).join('');
    }

    // Sort posts by published date descending
    posts.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    // Render recent posts
    const postsContainer = document.getElementById('recent-posts');
    if (posts.length === 0) {
      postsContainer.innerHTML = '<p class="empty">No posts yet. <a href="/admin/editor">Create your first post</a></p>';
    } else {
      postsContainer.innerHTML = posts.slice(0, 5).map(p => `
        <a href="/admin/editor?post=${p.id}" class="item-row item-row--link">
          <span class="item-title">${escapeHtml(p.title)}</span>
          <span class="item-date">${formatDate(p.publishedAt)}</span>
        </a>
      `).join('');
    }

  } catch (err) {
    console.error('Failed to load dashboard:', err);
  }
}

loadDashboard();
