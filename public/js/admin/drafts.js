// Admin Drafts Page JavaScript

import { escapeHtml, formatDateTime as formatDate } from '/js/utils.js';

// Elements
const draftsList = document.getElementById('drafts-list');
const confirmDialog = document.getElementById('confirm-dialog');
const dialogTitle = document.getElementById('dialog-title');
const dialogMessage = document.getElementById('dialog-message');
const dialogCancel = document.getElementById('dialog-cancel');
const dialogConfirm = document.getElementById('dialog-confirm');
const shareDialog = document.getElementById('share-dialog');
const shareUrlInput = document.getElementById('share-url');
const copyUrlBtn = document.getElementById('copy-url');
const shareClose = document.getElementById('share-close');

// State
let pendingAction = null;

// Load drafts on page load
async function loadDrafts() {
  try {
    const res = await fetch('/api/admin/drafts');

    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      throw new Error('Failed to load drafts');
    }

    const drafts = await res.json();
    renderDrafts(drafts);

  } catch (err) {
    console.error('Failed to load drafts:', err);
    draftsList.innerHTML = '<p class="empty">Failed to load drafts</p>';
  }
}

// Render drafts table
function renderDrafts(drafts) {
  if (drafts.length === 0) {
    draftsList.innerHTML = `
      <p class="empty">No drafts yet. <a href="/admin/editor">Create your first draft</a></p>
    `;
    return;
  }

  // Sort by updated date descending
  drafts.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  draftsList.innerHTML = `
    <div class="table-wrapper">
      <table class="admin-table">
        <thead>
          <tr>
            <th class="col-title">Title</th>
            <th class="col-date">Last Updated</th>
            <th class="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${drafts.map(draft => `
            <tr data-id="${draft.id}">
              <td class="draft-title">
                <a href="/admin/editor?draft=${draft.id}">
                  ${draft.title ? escapeHtml(draft.title) : '<span class="untitled">Untitled</span>'}
                </a>
              </td>
              <td class="draft-date">${formatDate(draft.updatedAt)}</td>
              <td class="draft-actions">
                <a href="/admin/editor?draft=${draft.id}" class="btn-action">Edit</a>
                <button class="btn-action" data-action="share" data-id="${draft.id}">Share</button>
                <button class="btn-action primary" data-action="publish" data-id="${draft.id}">Publish</button>
                <button class="btn-action danger" data-action="delete" data-id="${draft.id}">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Add event listeners for action buttons
  draftsList.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => handleAction(btn.dataset.action, btn.dataset.id));
  });
}

// Handle action buttons
function handleAction(action, id) {
  const draft = document.querySelector(`tr[data-id="${id}"]`);
  const title = draft?.querySelector('.draft-title a')?.textContent?.trim() || 'this draft';

  if (action === 'publish') {
    showConfirmDialog(
      'Publish Draft',
      `Are you sure you want to publish "${title}"?`,
      () => publishDraft(id)
    );
  } else if (action === 'delete') {
    showConfirmDialog(
      'Delete Draft',
      `Are you sure you want to permanently delete "${title}"? This cannot be undone.`,
      () => deleteDraft(id)
    );
  } else if (action === 'share') {
    createShareLink(id);
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

// Share dialog handlers
shareClose.addEventListener('click', () => {
  shareDialog.hidden = true;
});

shareDialog.addEventListener('click', (e) => {
  if (e.target === shareDialog) {
    shareDialog.hidden = true;
  }
});

copyUrlBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(shareUrlInput.value);
    copyUrlBtn.textContent = 'Copied!';
    setTimeout(() => {
      copyUrlBtn.textContent = 'Copy';
    }, 2000);
  } catch (err) {
    shareUrlInput.select();
    document.execCommand('copy');
  }
});

// Create share link
async function createShareLink(id) {
  try {
    const res = await fetch(`/api/admin/drafts/${id}/share`, {
      method: 'POST',
    });

    if (res.ok) {
      const data = await res.json();
      shareUrlInput.value = window.location.origin + data.url;
      shareDialog.hidden = false;
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to create share link');
    }
  } catch (err) {
    alert('Failed to create share link');
  }
}

// Publish draft
async function publishDraft(id) {
  try {
    const res = await fetch(`/api/admin/drafts/${id}/publish`, {
      method: 'POST',
    });

    if (res.ok) {
      window.location.href = '/admin/posts';
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to publish');
    }
  } catch (err) {
    alert('Failed to publish draft');
  }
}

// Delete draft
async function deleteDraft(id) {
  try {
    const res = await fetch(`/api/admin/drafts/${id}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      loadDrafts();
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to delete');
    }
  } catch (err) {
    alert('Failed to delete draft');
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
    if (!shareDialog.hidden) {
      shareDialog.hidden = true;
    }
  }
});

// Initialize
loadDrafts();
