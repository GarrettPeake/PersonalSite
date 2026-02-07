// Admin Projects Page JavaScript

import { escapeHtml, sanitizeSvg } from '/js/utils.js';

// Elements
const projectsList = document.getElementById('projects-list');
const addProjectBtn = document.getElementById('add-project-btn');
const projectDialog = document.getElementById('project-dialog');
const dialogTitle = document.getElementById('dialog-title');
const projectForm = document.getElementById('project-form');
const projectIdInput = document.getElementById('project-id');
const projectTitleInput = document.getElementById('project-title');
const projectDescriptionInput = document.getElementById('project-description');
const projectCancel = document.getElementById('project-cancel');
const iconSvgInput = document.getElementById('icon-svg');
const iconSvgArea = document.getElementById('icon-svg-input');
const iconImageArea = document.getElementById('icon-image-input');
const iconFileInput = document.getElementById('icon-file');
const iconUrlInput = document.getElementById('icon-url');
const iconAltInput = document.getElementById('icon-alt');
const svgPreview = document.getElementById('svg-preview');
const imagePreview = document.getElementById('image-preview');
const togglePreviewBtn = document.getElementById('toggle-preview');
const descriptionPreview = document.getElementById('description-preview');
const contentPiecesContainer = document.getElementById('content-pieces');
const addContentBtn = document.getElementById('add-content-btn');

// Content piece dialog elements
const contentPieceDialog = document.getElementById('content-piece-dialog');
const contentPieceTitle = document.getElementById('content-piece-title');
const contentPieceForm = document.getElementById('content-piece-form');
const contentPieceIndex = document.getElementById('content-piece-index');
const contentImageInput = document.getElementById('content-image-input');
const contentIframeInput = document.getElementById('content-iframe-input');
const contentFileInput = document.getElementById('content-file');
const contentImageUrl = document.getElementById('content-image-url');
const contentIframeUrl = document.getElementById('content-iframe-url');
const contentDescription = document.getElementById('content-description');
const contentImagePreview = document.getElementById('content-image-preview');
const contentPieceCancel = document.getElementById('content-piece-cancel');

// Confirm dialog elements
const confirmDialog = document.getElementById('confirm-dialog');
const dialogCancel = document.getElementById('dialog-cancel');
const dialogConfirm = document.getElementById('dialog-confirm');

// State
let projects = [];
let pendingDeleteId = null;
let currentContentPieces = [];
let pendingIconFile = null;
let pendingContentFile = null;

// Load projects on page load
async function loadProjects() {
  try {
    const res = await fetch('/api/admin/projects');

    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      throw new Error('Failed to load projects');
    }

    projects = await res.json();
    renderProjects();

  } catch (err) {
    console.error('Failed to load projects:', err);
    projectsList.innerHTML = '<p class="empty">Failed to load projects</p>';
  }
}

// Render projects list
function renderProjects() {
  if (projects.length === 0) {
    projectsList.innerHTML = '<p class="empty">No projects yet. Click "+ Add Project" to create one.</p>';
    return;
  }

  projectsList.innerHTML = projects.map((project, index) => `
    <div class="project-row" data-id="${project.id}">
      <div class="project-drag-handle">
        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
          <circle cx="9" cy="6" r="1.5"/>
          <circle cx="15" cy="6" r="1.5"/>
          <circle cx="9" cy="12" r="1.5"/>
          <circle cx="15" cy="12" r="1.5"/>
          <circle cx="9" cy="18" r="1.5"/>
          <circle cx="15" cy="18" r="1.5"/>
        </svg>
      </div>
      <div class="project-icon">
        ${project.iconType === 'svg' ? sanitizeSvg(project.icon) : `<img src="${escapeHtml(project.icon)}" alt="${escapeHtml(project.iconAlt || project.title + ' icon')}">`}
      </div>
      <div class="project-info">
        <span class="project-title">${escapeHtml(project.title)}</span>
        <span class="project-meta">${project.contentPieces.length} content piece${project.contentPieces.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="project-actions">
        <button class="btn btn--sm btn--secondary" data-action="edit" data-id="${project.id}">Edit</button>
        <button class="btn btn--sm btn--secondary" data-action="move-up" data-id="${project.id}" ${index === 0 ? 'disabled' : ''}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 15l-6-6-6 6"/>
          </svg>
        </button>
        <button class="btn btn--sm btn--secondary" data-action="move-down" data-id="${project.id}" ${index === projects.length - 1 ? 'disabled' : ''}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>
        <button class="btn btn--sm btn--danger" data-action="delete" data-id="${project.id}">Delete</button>
      </div>
    </div>
  `).join('');

  // Add event listeners for action buttons
  projectsList.querySelectorAll('[data-action]').forEach(btn => {
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
  } else if (action === 'move-up') {
    moveProject(id, -1);
  } else if (action === 'move-down') {
    moveProject(id, 1);
  }
}

// Move project up or down
async function moveProject(id, direction) {
  const index = projects.findIndex(p => p.id === id);
  if (index === -1) return;

  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= projects.length) return;

  // Swap in local array
  const temp = projects[index];
  projects[index] = projects[newIndex];
  projects[newIndex] = temp;

  // Update order on server
  const orderedIds = projects.map(p => p.id);

  try {
    const res = await fetch('/api/admin/projects/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: orderedIds }),
    });

    if (!res.ok) {
      throw new Error('Failed to reorder');
    }

    renderProjects();

  } catch (err) {
    console.error('Failed to reorder:', err);
    loadProjects(); // Reload to get correct order
  }
}

// =============================================================================
// Project Dialog
// =============================================================================

function showCreateDialog() {
  dialogTitle.textContent = 'Add Project';
  projectIdInput.value = '';
  projectForm.reset();
  currentContentPieces = [];
  pendingIconFile = null;

  // Reset icon type to SVG
  document.querySelector('input[name="iconType"][value="svg"]').checked = true;
  iconSvgArea.hidden = false;
  iconImageArea.hidden = true;
  svgPreview.innerHTML = '';
  imagePreview.innerHTML = '';

  // Reset description preview
  descriptionPreview.hidden = true;
  togglePreviewBtn.textContent = 'Preview';

  renderContentPieces();
  projectDialog.hidden = false;
}

function showEditDialog(id) {
  const project = projects.find(p => p.id === id);
  if (!project) return;

  dialogTitle.textContent = 'Edit Project';
  projectIdInput.value = project.id;
  projectTitleInput.value = project.title;
  projectDescriptionInput.value = project.description;
  iconAltInput.value = project.iconAlt || '';
  currentContentPieces = JSON.parse(JSON.stringify(project.contentPieces)); // Deep copy
  pendingIconFile = null;

  // Set icon type and value
  if (project.iconType === 'svg') {
    document.querySelector('input[name="iconType"][value="svg"]').checked = true;
    iconSvgInput.value = project.icon;
    iconSvgArea.hidden = false;
    iconImageArea.hidden = true;
    updateSvgPreview();
  } else {
    document.querySelector('input[name="iconType"][value="image"]').checked = true;
    iconUrlInput.value = project.icon;
    iconSvgArea.hidden = true;
    iconImageArea.hidden = false;
    imagePreview.innerHTML = `<img src="${escapeHtml(project.icon)}" alt="Icon preview">`;
  }

  // Reset description preview
  descriptionPreview.hidden = true;
  togglePreviewBtn.textContent = 'Preview';

  renderContentPieces();
  projectDialog.hidden = false;
}

function hideProjectDialog() {
  projectDialog.hidden = true;
  projectForm.reset();
  currentContentPieces = [];
  pendingIconFile = null;
}

// Icon type toggle
document.querySelectorAll('input[name="iconType"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    if (e.target.value === 'svg') {
      iconSvgArea.hidden = false;
      iconImageArea.hidden = true;
    } else {
      iconSvgArea.hidden = true;
      iconImageArea.hidden = false;
    }
  });
});

// SVG preview
iconSvgInput.addEventListener('input', updateSvgPreview);

function updateSvgPreview() {
  const svg = iconSvgInput.value.trim();
  if (svg.startsWith('<svg')) {
    svgPreview.innerHTML = sanitizeSvg(svg);
  } else {
    svgPreview.innerHTML = '';
  }
}

// Icon file upload
iconFileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  pendingIconFile = file;

  // Show preview
  const reader = new FileReader();
  reader.onload = (e) => {
    imagePreview.innerHTML = `<img src="${e.target.result}" alt="Icon preview">`;
    iconUrlInput.value = ''; // Clear URL input
  };
  reader.readAsDataURL(file);
});

// Icon URL input
iconUrlInput.addEventListener('input', (e) => {
  const url = e.target.value.trim();
  if (url) {
    imagePreview.innerHTML = `<img src="${escapeHtml(url)}" alt="Icon preview">`;
    pendingIconFile = null;
    iconFileInput.value = '';
  }
});

// Description preview toggle
togglePreviewBtn.addEventListener('click', () => {
  if (descriptionPreview.hidden) {
    const markdown = projectDescriptionInput.value;
    descriptionPreview.innerHTML = window.renderMarkdown ? window.renderMarkdown(markdown) : escapeHtml(markdown);
    descriptionPreview.hidden = false;
    togglePreviewBtn.textContent = 'Edit';
  } else {
    descriptionPreview.hidden = true;
    togglePreviewBtn.textContent = 'Preview';
  }
});

// Form submission
projectForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const submitBtn = projectForm.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Saving...';
  submitBtn.disabled = true;

  try {
    const iconType = document.querySelector('input[name="iconType"]:checked').value;
    let icon = '';

    if (iconType === 'svg') {
      icon = iconSvgInput.value.trim();
      if (!icon) throw new Error('Please enter SVG code for the icon');
    } else {
      // Upload icon file if pending
      if (pendingIconFile) {
        icon = await uploadFile(pendingIconFile);
      } else {
        icon = iconUrlInput.value.trim();
      }
      if (!icon) throw new Error('Please upload an icon image or enter a URL');
    }

    const projectData = {
      title: projectTitleInput.value.trim(),
      icon,
      iconType,
      iconAlt: iconAltInput.value.trim(),
      description: projectDescriptionInput.value,
      contentPieces: currentContentPieces,
    };

    const id = projectIdInput.value;
    const isEdit = !!id;

    const res = await fetch(isEdit ? `/api/admin/projects/${id}` : '/api/admin/projects', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectData),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save project');
    }

    hideProjectDialog();
    loadProjects();

  } catch (err) {
    alert(err.message);
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
});

projectCancel.addEventListener('click', hideProjectDialog);

projectDialog.addEventListener('click', (e) => {
  if (e.target === projectDialog) {
    hideProjectDialog();
  }
});

addProjectBtn.addEventListener('click', showCreateDialog);

// =============================================================================
// Content Pieces Management
// =============================================================================

function renderContentPieces() {
  if (currentContentPieces.length === 0) {
    contentPiecesContainer.innerHTML = '<p class="empty-pieces">No content pieces yet</p>';
    return;
  }

  contentPiecesContainer.innerHTML = currentContentPieces.map((piece, index) => `
    <div class="content-piece-row" data-index="${index}">
      <div class="content-piece-drag">
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
          <circle cx="9" cy="6" r="1.5"/>
          <circle cx="15" cy="6" r="1.5"/>
          <circle cx="9" cy="12" r="1.5"/>
          <circle cx="15" cy="12" r="1.5"/>
        </svg>
      </div>
      <div class="content-piece-info">
        <span class="content-piece-type">${piece.type === 'image' ? 'Image' : 'Iframe'}</span>
        <span class="content-piece-url">${escapeHtml(truncateUrl(piece.url))}</span>
      </div>
      <div class="content-piece-actions">
        <button type="button" class="btn btn--sm btn--secondary" data-action="edit-piece" data-index="${index}">Edit</button>
        <button type="button" class="btn btn--sm btn--ghost-danger" data-action="remove-piece" data-index="${index}">Remove</button>
      </div>
    </div>
  `).join('');

  // Add event listeners
  contentPiecesContainer.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const index = parseInt(btn.dataset.index);
      if (btn.dataset.action === 'edit-piece') {
        showContentPieceDialog(index);
      } else if (btn.dataset.action === 'remove-piece') {
        currentContentPieces.splice(index, 1);
        renderContentPieces();
      }
    });
  });
}

function truncateUrl(url) {
  if (url.length > 50) {
    return url.substring(0, 47) + '...';
  }
  return url;
}

addContentBtn.addEventListener('click', () => {
  showContentPieceDialog(-1); // -1 means new
});

// =============================================================================
// Content Piece Dialog
// =============================================================================

function showContentPieceDialog(index) {
  const isEdit = index >= 0;
  contentPieceTitle.textContent = isEdit ? 'Edit Content Piece' : 'Add Content Piece';
  contentPieceIndex.value = index;
  pendingContentFile = null;

  if (isEdit) {
    const piece = currentContentPieces[index];
    document.querySelector(`input[name="contentType"][value="${piece.type}"]`).checked = true;

    if (piece.type === 'image') {
      contentImageInput.hidden = false;
      contentIframeInput.hidden = true;
      contentImageUrl.value = piece.url;
      contentImagePreview.innerHTML = `<img src="${escapeHtml(piece.url)}" alt="Preview">`;
    } else {
      contentImageInput.hidden = true;
      contentIframeInput.hidden = false;
      contentIframeUrl.value = piece.url;
    }

    contentDescription.value = piece.description || '';
  } else {
    contentPieceForm.reset();
    document.querySelector('input[name="contentType"][value="image"]').checked = true;
    contentImageInput.hidden = false;
    contentIframeInput.hidden = true;
    contentImagePreview.innerHTML = '';
  }

  contentPieceDialog.hidden = false;
}

function hideContentPieceDialog() {
  contentPieceDialog.hidden = true;
  contentPieceForm.reset();
  contentImagePreview.innerHTML = '';
  pendingContentFile = null;
}

// Content type toggle
document.querySelectorAll('input[name="contentType"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    if (e.target.value === 'image') {
      contentImageInput.hidden = false;
      contentIframeInput.hidden = true;
    } else {
      contentImageInput.hidden = true;
      contentIframeInput.hidden = false;
    }
  });
});

// Content file upload
contentFileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  pendingContentFile = file;

  const reader = new FileReader();
  reader.onload = (e) => {
    contentImagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
    contentImageUrl.value = '';
  };
  reader.readAsDataURL(file);
});

// Content URL input
contentImageUrl.addEventListener('input', (e) => {
  const url = e.target.value.trim();
  if (url) {
    contentImagePreview.innerHTML = `<img src="${escapeHtml(url)}" alt="Preview">`;
    pendingContentFile = null;
    contentFileInput.value = '';
  }
});

// Content piece form submission
contentPieceForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const submitBtn = contentPieceForm.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Saving...';
  submitBtn.disabled = true;

  try {
    const type = document.querySelector('input[name="contentType"]:checked').value;
    let url = '';

    if (type === 'image') {
      if (pendingContentFile) {
        url = await uploadFile(pendingContentFile);
      } else {
        url = contentImageUrl.value.trim();
      }
      if (!url) throw new Error('Please upload an image or enter a URL');
    } else {
      url = contentIframeUrl.value.trim();
      if (!url) throw new Error('Please enter a website URL');
    }

    const piece = {
      id: '',
      type,
      url,
      description: contentDescription.value,
      order: 0,
    };

    const index = parseInt(contentPieceIndex.value);
    if (index >= 0) {
      piece.id = currentContentPieces[index].id;
      piece.order = currentContentPieces[index].order;
      currentContentPieces[index] = piece;
    } else {
      piece.order = currentContentPieces.length;
      currentContentPieces.push(piece);
    }

    hideContentPieceDialog();
    renderContentPieces();

  } catch (err) {
    alert(err.message);
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
});

contentPieceCancel.addEventListener('click', hideContentPieceDialog);

contentPieceDialog.addEventListener('click', (e) => {
  if (e.target === contentPieceDialog) {
    hideContentPieceDialog();
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
    const res = await fetch(`/api/admin/projects/${id}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete project');
    }

    loadProjects();

  } catch (err) {
    alert(err.message);
  }
});

confirmDialog.addEventListener('click', (e) => {
  if (e.target === confirmDialog) {
    hideDeleteConfirm();
  }
});


async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/admin/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to upload file');
  }

  const data = await res.json();
  return data.url;
}

// Logout handler
document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/admin/login';
});

// Keyboard handlers
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!contentPieceDialog.hidden) hideContentPieceDialog();
    else if (!projectDialog.hidden) hideProjectDialog();
    else if (!confirmDialog.hidden) hideDeleteConfirm();
  }
});

// Initialize
loadProjects();
