// Photography Page JavaScript

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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPhotoGallery);
} else {
  initPhotoGallery();
}
