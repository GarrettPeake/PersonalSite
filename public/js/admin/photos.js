// Admin Photos Page JavaScript

// Elements
const photosGrid = document.getElementById('photos-grid');
const uploadDialog = document.getElementById('upload-dialog');
const uploadForm = document.getElementById('upload-form');
const uploadCancel = document.getElementById('upload-cancel');
const fileInput = document.getElementById('photo-file');
const fileUploadArea = document.getElementById('file-upload-area');
const filePlaceholder = document.getElementById('file-placeholder');
const filePreview = document.getElementById('file-preview');
const editDialog = document.getElementById('edit-dialog');
const editForm = document.getElementById('edit-form');
const editCancel = document.getElementById('edit-cancel');
const editPhotoId = document.getElementById('edit-photo-id');
const editPreview = document.getElementById('edit-preview');
const editLocation = document.getElementById('edit-location');
const editDescription = document.getElementById('edit-description');
const confirmDialog = document.getElementById('confirm-dialog');
const dialogCancel = document.getElementById('dialog-cancel');
const dialogConfirm = document.getElementById('dialog-confirm');

// State
let photos = [];
let pendingDeleteId = null;

// Load photos on page load
async function loadPhotos() {
  try {
    const res = await fetch('/api/admin/photos');

    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      throw new Error('Failed to load photos');
    }

    photos = await res.json();
    renderPhotos();

  } catch (err) {
    console.error('Failed to load photos:', err);
    photosGrid.innerHTML = '<p class="empty">Failed to load photos</p>';
  }
}

// Render photos grid
function renderPhotos() {
  const addButton = `
    <div class="photo-add" id="add-photo-btn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      <span>Add Photo</span>
    </div>
  `;

  if (photos.length === 0) {
    photosGrid.innerHTML = addButton;
  } else {
    photosGrid.innerHTML = addButton + photos.map(photo => `
      <div class="photo-item" data-id="${photo.id}">
        <img src="${escapeHtml(photo.url)}" alt="${escapeHtml(photo.description || 'Photo')}" loading="lazy">
        <div class="photo-overlay">
          <button class="btn btn--sm btn--secondary" data-action="edit" data-id="${photo.id}">Edit</button>
          <button class="btn btn--sm btn--danger" data-action="delete" data-id="${photo.id}">Delete</button>
        </div>
      </div>
    `).join('');
  }

  // Add event listener for add button
  document.getElementById('add-photo-btn').addEventListener('click', showUploadDialog);

  // Add event listeners for action buttons
  photosGrid.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleAction(btn.dataset.action, btn.dataset.id);
    });
  });
}

// Handle action buttons
function handleAction(action, id) {
  if (action === 'edit') {
    showEditDialog(id);
  } else if (action === 'delete') {
    showDeleteConfirm(id);
  }
}

// =============================================================================
// Upload Dialog
// =============================================================================

function showUploadDialog() {
  uploadForm.reset();
  filePreview.hidden = true;
  filePlaceholder.hidden = false;
  uploadDialog.hidden = false;
}

function hideUploadDialog() {
  uploadDialog.hidden = true;
  uploadForm.reset();
  filePreview.hidden = true;
  filePlaceholder.hidden = false;
}

// File preview handling
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    showFilePreview(file);
  }
});

// Drag and drop handling
fileUploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  fileUploadArea.classList.add('dragover');
});

fileUploadArea.addEventListener('dragleave', () => {
  fileUploadArea.classList.remove('dragover');
});

fileUploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  fileUploadArea.classList.remove('dragover');

  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    // Update the file input
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;
    showFilePreview(file);
  }
});

function showFilePreview(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    filePreview.src = e.target.result;
    filePreview.hidden = false;
    filePlaceholder.hidden = true;
  };
  reader.readAsDataURL(file);
}

// Upload form submission
uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const submitBtn = uploadForm.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Uploading...';
  submitBtn.disabled = true;

  try {
    const formData = new FormData(uploadForm);

    const res = await fetch('/api/admin/photos', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to upload photo');
    }

    hideUploadDialog();
    loadPhotos();

  } catch (err) {
    alert(err.message);
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
});

uploadCancel.addEventListener('click', hideUploadDialog);

uploadDialog.addEventListener('click', (e) => {
  if (e.target === uploadDialog) {
    hideUploadDialog();
  }
});

// =============================================================================
// Edit Dialog
// =============================================================================

function showEditDialog(id) {
  const photo = photos.find(p => p.id === id);
  if (!photo) return;

  editPhotoId.value = photo.id;
  editPreview.src = photo.url;
  editLocation.value = photo.location || '';
  editDescription.value = photo.description || '';
  editDialog.hidden = false;
}

function hideEditDialog() {
  editDialog.hidden = true;
  editForm.reset();
}

editForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = editPhotoId.value;
  const submitBtn = editForm.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Saving...';
  submitBtn.disabled = true;

  try {
    const res = await fetch(`/api/admin/photos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: editLocation.value,
        description: editDescription.value,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update photo');
    }

    hideEditDialog();
    loadPhotos();

  } catch (err) {
    alert(err.message);
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
});

editCancel.addEventListener('click', hideEditDialog);

editDialog.addEventListener('click', (e) => {
  if (e.target === editDialog) {
    hideEditDialog();
  }
});

// =============================================================================
// Delete Confirmation
// =============================================================================

function showDeleteConfirm(id) {
  pendingDeleteId = id;
  confirmDialog.hidden = false;
}

function hideDeleteConfirm() {
  confirmDialog.hidden = true;
  pendingDeleteId = null;
}

dialogCancel.addEventListener('click', hideDeleteConfirm);

dialogConfirm.addEventListener('click', async () => {
  if (!pendingDeleteId) return;

  const id = pendingDeleteId;
  hideDeleteConfirm();

  try {
    const res = await fetch(`/api/admin/photos/${id}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete photo');
    }

    loadPhotos();

  } catch (err) {
    alert(err.message);
  }
});

confirmDialog.addEventListener('click', (e) => {
  if (e.target === confirmDialog) {
    hideDeleteConfirm();
  }
});

// =============================================================================
// Utilities
// =============================================================================

function escapeHtml(text) {
  if (!text) return '';
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
    if (!uploadDialog.hidden) hideUploadDialog();
    if (!editDialog.hidden) hideEditDialog();
    if (!confirmDialog.hidden) hideDeleteConfirm();
  }
});

// Initialize
loadPhotos();
