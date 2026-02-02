/**
 * Photography Section Module
 *
 * Displays photo grid within the SPA.
 * Integrates with existing gp-photo-modal component.
 */

let photos = [];

const template = `
  <div class="photography-section">
    <div class="photo-content">
      <div class="photo-grid" id="spa-photo-grid"></div>
    </div>
  </div>
`;

async function init(container) {
  const photoGrid = container.querySelector('#spa-photo-grid');

  try {
    const res = await fetch('/api/photos');

    if (!res.ok) {
      throw new Error('Failed to load photos');
    }

    photos = await res.json();
    renderPhotoGrid(container);
    initPhotoGallery(container);

  } catch (err) {
    console.error('Failed to load photos:', err);
    photoGrid.innerHTML = '';
  }
}

function renderPhotoGrid(container) {
  const photoGrid = container.querySelector('#spa-photo-grid');

  if (photos.length === 0) {
    photoGrid.innerHTML = '';
    return;
  }

  photoGrid.innerHTML = photos.map(photo => `
    <div class="photo-item" role="button" tabindex="0" aria-label="${escapeAttr(photo.description || photo.location || 'View photo')}" data-id="${photo.id}" data-location="${escapeAttr(photo.location)}" data-description="${escapeAttr(photo.description)}">
      <img src="${escapeAttr(photo.url)}" alt="${escapeAttr(photo.description || 'Photo')}" loading="lazy">
    </div>
  `).join('');
}

function initPhotoGallery(container) {
  const photoGrid = container.querySelector('#spa-photo-grid');
  const photoModal = document.querySelector('gp-photo-modal');

  if (!photoGrid || !photoModal) return;

  function openPhoto(photoItem) {
    const img = photoItem.querySelector('img');
    const imageSrc = img ? img.src : null;
    const location = photoItem.dataset.location || '';
    const description = photoItem.dataset.description || '';

    photoModal.open({
      imageSrc,
      location,
      description
    });
  }

  photoGrid.addEventListener('click', (e) => {
    const photoItem = e.target.closest('.photo-item');
    if (!photoItem) return;
    openPhoto(photoItem);
  });

  photoGrid.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const photoItem = e.target.closest('.photo-item');
    if (!photoItem) return;
    e.preventDefault();
    openPhoto(photoItem);
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

export default {
  template,
  init
};
