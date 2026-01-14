// Photography Page JavaScript

let photos = [];

async function loadPhotos() {
  const photoGrid = document.getElementById('photo-grid');

  try {
    const res = await fetch('/api/photos');

    if (!res.ok) {
      throw new Error('Failed to load photos');
    }

    photos = await res.json();
    renderPhotoGrid();

  } catch (err) {
    console.error('Failed to load photos:', err);
    photoGrid.innerHTML = '<p class="empty">No photos yet</p>';
  }
}

function renderPhotoGrid() {
  const photoGrid = document.getElementById('photo-grid');

  if (photos.length === 0) {
    photoGrid.innerHTML = '<p class="empty">No photos yet</p>';
    return;
  }

  photoGrid.innerHTML = photos.map(photo => `
    <div class="photo-item" data-id="${photo.id}" data-location="${escapeAttr(photo.location)}" data-description="${escapeAttr(photo.description)}">
      <img src="${escapeAttr(photo.url)}" alt="${escapeAttr(photo.description || 'Photo')}" loading="lazy">
    </div>
  `).join('');

  initPhotoGallery();
}

function initPhotoGallery() {
  const photoGrid = document.getElementById('photo-grid');
  const photoModal = document.querySelector('gp-photo-modal');

  if (!photoGrid || !photoModal) return;

  // Handle click on photo items
  photoGrid.addEventListener('click', (e) => {
    const photoItem = e.target.closest('.photo-item');
    if (!photoItem) return;

    const img = photoItem.querySelector('img');
    const imageSrc = img ? img.src : null;
    const location = photoItem.dataset.location || '';
    const description = photoItem.dataset.description || '';

    photoModal.open({
      imageSrc,
      location,
      description
    });
  });
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadPhotos);
} else {
  loadPhotos();
}
