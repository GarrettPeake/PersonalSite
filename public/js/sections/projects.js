/**
 * Projects Section Module
 *
 * Displays the project carousel within the SPA.
 * Reuses carousel/shelf logic from home.js.
 */

let projects = [];

const template = `
  <div class="project-display">
    <div class="project-frame">
      <!-- Guidelines -->
      <div class="guideline guideline-top"></div>
      <div class="guideline guideline-right"></div>
      <div class="guideline guideline-bottom"></div>
      <div class="guideline guideline-left"></div>

      <!-- Carousel -->
      <div class="carousel" id="spa-project-carousel">
        <div class="carousel-track">
          <div class="carousel-slide active" data-project="0">
            <div class="slide-placeholder">
              <span>Loading projects...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
`;

async function init(container) {
  try {
    const res = await fetch('/api/projects');
    if (!res.ok) throw new Error('Failed to load projects');
    projects = await res.json();
    renderProjects(container);
    initShelfSync();
  } catch (err) {
    console.error('Failed to load projects:', err);
    const carousel = container.querySelector('.carousel-track');
    if (carousel) {
      carousel.innerHTML = `
        <div class="carousel-slide active" data-project="0">
          <div class="slide-placeholder">
            <span>No projects available</span>
          </div>
        </div>
      `;
    }
  }
}

function renderProjects(container) {
  const carouselTrack = container.querySelector('.carousel-track');
  const shelfItems = document.getElementById('shelf-items');
  const descriptionText = document.querySelector('.description-text');

  if (projects.length === 0) {
    if (carouselTrack) {
      carouselTrack.innerHTML = `
        <div class="carousel-slide active" data-project="0">
          <div class="slide-placeholder">
            <span>No projects yet</span>
          </div>
        </div>
      `;
    }
    return;
  }

  // Render carousel slides
  if (carouselTrack) {
    carouselTrack.innerHTML = projects.map((project, index) => {
      const content = renderCarouselContent(project);
      return `
        <div class="carousel-slide ${index === 0 ? 'active' : ''}" data-project="${index}">
          ${content}
        </div>
      `;
    }).join('');
  }

  // Render shelf items (in main shelf panel)
  if (shelfItems) {
    shelfItems.innerHTML = projects.map((project, index) => `
      <div
        class="shelf-item ${index === 0 ? 'active' : ''}"
        data-project="${index}"
        data-id="${project.id}"
        data-title="${escapeAttr(project.title)}"
        data-description="${escapeAttr(project.description)}"
      >
        <div class="shelf-item-icon">
          ${project.iconType === 'svg' ? project.icon : `<img src="${escapeAttr(project.icon)}" alt="">`}
        </div>
        <div class="shelf-item-legend">${escapeHtml(project.title)}</div>
      </div>
    `).join('');
  }

  // Set initial description
  if (descriptionText && projects.length > 0) {
    descriptionText.innerHTML = renderMarkdownSimple(projects[0].description) || 'Select a project';
  }
}

function renderCarouselContent(project) {
  if (!project.contentPieces || project.contentPieces.length === 0) {
    return `
      <div class="slide-placeholder">
        <span>${escapeHtml(project.title)}</span>
      </div>
    `;
  }

  const piece = project.contentPieces[0];

  if (piece.type === 'iframe') {
    return `<iframe src="${escapeAttr(piece.url)}" title="${escapeAttr(project.title)}" loading="lazy"></iframe>`;
  } else {
    return `
      <div class="slide-image">
        <img src="${escapeAttr(piece.url)}" alt="${escapeAttr(piece.description || project.title)}" loading="lazy">
        ${piece.description ? `<div class="slide-caption">${renderMarkdownSimple(piece.description)}</div>` : ''}
      </div>
    `;
  }
}

function initShelfSync() {
  const shelfItems = document.getElementById('shelf-items');
  const descriptionText = document.querySelector('.description-text');

  if (!shelfItems) return;

  // Handle shelf item interactions
  shelfItems.addEventListener('mouseover', (e) => {
    const item = e.target.closest('.shelf-item');
    if (!item) return;

    const projectIndex = parseInt(item.dataset.project);
    const project = projects[projectIndex];
    if (project && descriptionText) {
      descriptionText.innerHTML = renderMarkdownSimple(project.description) || '';
    }
  });

  shelfItems.addEventListener('mouseout', (e) => {
    const item = e.target.closest('.shelf-item');
    if (!item) return;

    const activeItem = shelfItems.querySelector('.shelf-item.active');
    if (activeItem && descriptionText) {
      const activeIndex = parseInt(activeItem.dataset.project);
      const project = projects[activeIndex];
      descriptionText.innerHTML = project ? renderMarkdownSimple(project.description) : 'Select a project';
    } else if (descriptionText) {
      descriptionText.innerHTML = 'Hover over a project to see details';
    }
  });

  shelfItems.addEventListener('click', (e) => {
    const item = e.target.closest('.shelf-item');
    if (!item) return;

    // Update active state
    shelfItems.querySelectorAll('.shelf-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');

    // Update description
    const projectIndex = parseInt(item.dataset.project);
    const project = projects[projectIndex];
    if (project && descriptionText) {
      descriptionText.innerHTML = renderMarkdownSimple(project.description) || '';
    }

    // Update carousel
    updateCarousel(item.dataset.project);
  });
}

function updateCarousel(projectId) {
  const track = document.querySelector('#spa-project-carousel .carousel-track');
  if (!track) return;

  const slides = track.querySelectorAll('.carousel-slide');
  slides.forEach(slide => {
    slide.classList.remove('active');
    if (slide.dataset.project === projectId) {
      setTimeout(() => {
        slide.classList.add('active');
      }, 150);
    }
  });
}

// Utility functions
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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

function renderMarkdownSimple(text) {
  if (!text) return '';
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

export default {
  template,
  init
};
