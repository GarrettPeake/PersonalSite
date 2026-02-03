// Admin Posts Page JavaScript

import { escapeHtml, formatDateShort as formatDate } from '/js/utils.js';

// Elements
const postsList = document.getElementById('posts-list');
const confirmDialog = document.getElementById('confirm-dialog');
const dialogTitle = document.getElementById('dialog-title');
const dialogMessage = document.getElementById('dialog-message');
const dialogCancel = document.getElementById('dialog-cancel');
const dialogConfirm = document.getElementById('dialog-confirm');

// State
let pendingAction = null;

// Load posts on page load
async function loadPosts() {
  try {
    const res = await fetch('/api/admin/posts');

    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      throw new Error('Failed to load posts');
    }

    const posts = await res.json();
    renderPosts(posts);

  } catch (err) {
    console.error('Failed to load posts:', err);
    postsList.innerHTML = '<p class="empty">Failed to load posts</p>';
  }
}

// Render posts table
function renderPosts(posts) {
  if (posts.length === 0) {
    postsList.innerHTML = `
      <p class="empty">No published posts yet. <a href="/admin/editor">Create your first post</a></p>
    `;
    return;
  }

  // Sort by published date descending
  posts.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  postsList.innerHTML = `
    <div class="table-wrapper">
      <table class="admin-table">
        <thead>
          <tr>
            <th class="col-title">Title</th>
            <th class="col-slug">Slug</th>
            <th class="col-date">Published</th>
            <th class="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${posts.map(post => `
            <tr data-id="${post.id}">
              <td class="post-title">
                <a href="/blog/${post.slug}" target="_blank">${escapeHtml(post.title)}</a>
              </td>
              <td class="post-slug cell-truncate">/blog/${escapeHtml(post.slug)}</td>
              <td class="post-date">${formatDate(post.publishedAt)}</td>
              <td class="post-actions">
                <a href="/admin/editor?post=${post.id}" class="btn-action">Edit</a>
                <button class="btn-action" data-action="unpublish" data-id="${post.id}">Unpublish</button>
                <button class="btn-action danger" data-action="delete" data-id="${post.id}">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Add event listeners for action buttons
  postsList.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => handleAction(btn.dataset.action, btn.dataset.id));
  });
}

// Handle action buttons
function handleAction(action, id) {
  const post = document.querySelector(`tr[data-id="${id}"]`);
  const title = post?.querySelector('.post-title a')?.textContent || 'this post';

  if (action === 'unpublish') {
    showConfirmDialog(
      'Unpublish Post',
      `Are you sure you want to unpublish "${title}"? It will be moved to drafts.`,
      () => unpublishPost(id)
    );
  } else if (action === 'delete') {
    showConfirmDialog(
      'Delete Post',
      `Are you sure you want to permanently delete "${title}"? This cannot be undone.`,
      () => deletePost(id)
    );
  }
}

// Show confirm dialog
function showConfirmDialog(title, message, onConfirm) {
  dialogTitle.textContent = title;
  dialogMessage.textContent = message;
  pendingAction = onConfirm;
  confirmDialog.hidden = false;
}

// Hide confirm dialog
function hideConfirmDialog() {
  confirmDialog.hidden = true;
  pendingAction = null;
}

// Dialog event listeners
dialogCancel.addEventListener('click', hideConfirmDialog);
dialogConfirm.addEventListener('click', async () => {
  if (pendingAction) {
    await pendingAction();
  }
  hideConfirmDialog();
});

// Click outside to close
confirmDialog.addEventListener('click', (e) => {
  if (e.target === confirmDialog) {
    hideConfirmDialog();
  }
});

// Unpublish post
async function unpublishPost(id) {
  try {
    const res = await fetch(`/api/admin/posts/${id}/unpublish`, {
      method: 'POST',
    });

    if (res.ok) {
      loadPosts();
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to unpublish');
    }
  } catch (err) {
    alert('Failed to unpublish post');
  }
}

// Delete post
async function deletePost(id) {
  try {
    const res = await fetch(`/api/admin/posts/${id}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      loadPosts();
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to delete');
    }
  } catch (err) {
    alert('Failed to delete post');
  }
}

// Logout handler
document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/admin/login';
});

// Keyboard handlers
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!confirmDialog.hidden) {
      hideConfirmDialog();
    }
  }
});

// Initialize
loadPosts();
