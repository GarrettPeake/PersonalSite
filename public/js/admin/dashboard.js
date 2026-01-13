// Admin Dashboard Page JavaScript

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

    // Render recent drafts
    const draftsContainer = document.getElementById('recent-drafts');
    if (drafts.length === 0) {
      draftsContainer.innerHTML = '<p class="empty">No drafts yet</p>';
    } else {
      draftsContainer.innerHTML = drafts.slice(0, 5).map(d => `
        <div class="item-row">
          <span class="item-title">${escapeHtml(d.title || 'Untitled')}</span>
          <span class="item-date">${formatDate(d.updatedAt)}</span>
        </div>
      `).join('');
    }

    // Render recent posts
    const postsContainer = document.getElementById('recent-posts');
    if (posts.length === 0) {
      postsContainer.innerHTML = '<p class="empty">No posts yet</p>';
    } else {
      postsContainer.innerHTML = posts.slice(0, 5).map(p => `
        <div class="item-row">
          <span class="item-title">${escapeHtml(p.title)}</span>
          <span class="item-date">${formatDate(p.publishedAt)}</span>
        </div>
      `).join('');
    }

  } catch (err) {
    console.error('Failed to load dashboard:', err);
  }
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

loadDashboard();
