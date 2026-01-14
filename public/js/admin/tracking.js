// Admin Tracking Page JavaScript

// Elements
const trackingList = document.getElementById('tracking-list');
const createBtn = document.getElementById('create-btn');
const createDialog = document.getElementById('create-dialog');
const createForm = document.getElementById('create-form');
const createCancel = document.getElementById('create-cancel');
const createError = document.getElementById('create-error');
const tagInput = document.getElementById('tag-input');
const slugInput = document.getElementById('slug-input');
const confirmDialog = document.getElementById('confirm-dialog');
const dialogTitle = document.getElementById('dialog-title');
const dialogMessage = document.getElementById('dialog-message');
const dialogCancel = document.getElementById('dialog-cancel');
const dialogConfirm = document.getElementById('dialog-confirm');
const eventsDialog = document.getElementById('events-dialog');
const eventsTitle = document.getElementById('events-title');
const eventsList = document.getElementById('events-list');
const eventsClose = document.getElementById('events-close');

// State
let pendingAction = null;
let trackingData = [];

// Load tracking links on page load
async function loadTracking() {
  try {
    const res = await fetch('/api/admin/tracking');

    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      throw new Error('Failed to load tracking');
    }

    trackingData = await res.json();
    renderTracking(trackingData);

  } catch (err) {
    console.error('Failed to load tracking:', err);
    trackingList.innerHTML = '<p class="empty">Failed to load tracking links</p>';
  }
}

// Render tracking table
function renderTracking(items) {
  if (items.length === 0) {
    trackingList.innerHTML = `
      <p class="empty">No tracking links yet. Create one to start tracking visitors.</p>
    `;
    return;
  }

  // Sort by created date descending
  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  trackingList.innerHTML = `
    <div class="table-header">
      <div>Tag</div>
      <div>Link</div>
      <div>Status</div>
      <div>Visits</div>
      <div>Actions</div>
    </div>
    ${items.map(item => {
      const visited = item.events && item.events.length > 0;
      const visitCount = item.events ? item.events.length : 0;
      return `
        <div class="table-row" data-slug="${item.slug}">
          <div class="tracking-tag">${escapeHtml(item.tag)}</div>
          <div class="tracking-url">/s/${escapeHtml(item.slug)}</div>
          <div class="tracking-status">
            <span class="status-dot ${visited ? 'visited' : ''}"></span>
            <span>${visited ? 'Visited' : 'Not visited'}</span>
          </div>
          <div class="tracking-visits">${visitCount} ${visitCount === 1 ? 'visit' : 'visits'}</div>
          <div class="tracking-actions">
            <button class="btn-action" data-action="copy" data-slug="${item.slug}">Copy</button>
            <button class="btn-action" data-action="events" data-slug="${item.slug}" ${!visited ? 'disabled' : ''}>Events</button>
            <button class="btn-action danger" data-action="delete" data-slug="${item.slug}">Delete</button>
          </div>
        </div>
      `;
    }).join('')}
  `;

  // Add event listeners for action buttons
  trackingList.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!btn.disabled) {
        handleAction(btn.dataset.action, btn.dataset.slug);
      }
    });
  });
}

// Handle action buttons
function handleAction(action, slug) {
  if (action === 'copy') {
    copyLink(slug);
  } else if (action === 'events') {
    showEvents(slug);
  } else if (action === 'delete') {
    const item = trackingData.find(t => t.slug === slug);
    showConfirmDialog(
      'Delete Tracking Link',
      `Are you sure you want to delete the tracking link for "${item?.tag || slug}"? This will also delete all event data.`,
      () => deleteTracking(slug)
    );
  }
}

// Copy link to clipboard
async function copyLink(slug) {
  const url = `${window.location.origin}/s/${slug}`;
  try {
    await navigator.clipboard.writeText(url);
    // Show feedback
    const btn = trackingList.querySelector(`[data-action="copy"][data-slug="${slug}"]`);
    if (btn) {
      const originalText = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => {
        btn.textContent = originalText;
      }, 2000);
    }
  } catch (err) {
    prompt('Copy this link:', url);
  }
}

// Show events dialog
async function showEvents(slug) {
  const item = trackingData.find(t => t.slug === slug);
  if (!item) return;

  eventsTitle.textContent = `Events for "${item.tag}"`;

  if (!item.events || item.events.length === 0) {
    eventsList.innerHTML = '<p class="no-events">No events recorded yet</p>';
  } else {
    // Sort events by time descending
    const sortedEvents = [...item.events].sort((a, b) =>
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    eventsList.innerHTML = sortedEvents.map(event => `
      <div class="event-item">
        <div class="event-time">${formatDateTime(event.timestamp)}</div>
        <div class="event-page">Page: ${escapeHtml(event.page)}</div>
        <div class="event-details">
          ${event.referrer ? `Referrer: ${escapeHtml(event.referrer)}<br>` : ''}
          ${event.userAgent ? `Browser: ${escapeHtml(truncate(event.userAgent, 60))}` : ''}
        </div>
      </div>
    `).join('');
  }

  eventsDialog.hidden = false;
}

// Create dialog handlers
createBtn.addEventListener('click', () => {
  createDialog.hidden = false;
  tagInput.value = '';
  slugInput.value = '';
  createError.hidden = true;
  tagInput.focus();
});

createCancel.addEventListener('click', () => {
  createDialog.hidden = true;
});

createDialog.addEventListener('click', (e) => {
  if (e.target === createDialog) {
    createDialog.hidden = true;
  }
});

createForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  createError.hidden = true;

  const tag = tagInput.value.trim();
  const slug = slugInput.value.trim();

  if (!tag) {
    createError.textContent = 'Tag name is required';
    createError.hidden = false;
    return;
  }

  try {
    const res = await fetch('/api/admin/tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag, slug: slug || undefined }),
    });

    if (res.ok) {
      createDialog.hidden = true;
      loadTracking();
    } else {
      const err = await res.json();
      createError.textContent = err.error || 'Failed to create tracking link';
      createError.hidden = false;
    }
  } catch (err) {
    createError.textContent = 'Failed to create tracking link';
    createError.hidden = false;
  }
});

// Confirm dialog handlers
function showConfirmDialog(title, message, onConfirm) {
  dialogTitle.textContent = title;
  dialogMessage.textContent = message;
  pendingAction = onConfirm;
  confirmDialog.hidden = false;
}

function hideConfirmDialog() {
  confirmDialog.hidden = true;
  pendingAction = null;
}

dialogCancel.addEventListener('click', hideConfirmDialog);
dialogConfirm.addEventListener('click', async () => {
  if (pendingAction) {
    await pendingAction();
  }
  hideConfirmDialog();
});

confirmDialog.addEventListener('click', (e) => {
  if (e.target === confirmDialog) {
    hideConfirmDialog();
  }
});

// Events dialog handlers
eventsClose.addEventListener('click', () => {
  eventsDialog.hidden = true;
});

eventsDialog.addEventListener('click', (e) => {
  if (e.target === eventsDialog) {
    eventsDialog.hidden = true;
  }
});

// Delete tracking
async function deleteTracking(slug) {
  try {
    const res = await fetch(`/api/admin/tracking/${slug}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      loadTracking();
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to delete');
    }
  } catch (err) {
    alert('Failed to delete tracking link');
  }
}

// Utility functions
function formatDateTime(iso) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit'
  });
}

function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Logout handler
document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/admin/login';
});

// Keyboard handlers
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!createDialog.hidden) {
      createDialog.hidden = true;
    }
    if (!confirmDialog.hidden) {
      hideConfirmDialog();
    }
    if (!eventsDialog.hidden) {
      eventsDialog.hidden = true;
    }
  }
});

// Initialize
loadTracking();
