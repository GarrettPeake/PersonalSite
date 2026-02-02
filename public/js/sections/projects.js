/**
 * Projects Section Module
 *
 * Desktop: Displays project carousel with shelf sync.
 * Mobile: Displays vertical project cards with expand/collapse.
 */

import { getLayoutMode } from '/js/spa/router.js';

let projects = [];

const desktopTemplate = `
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

const mobileTemplate = `
  <div class="mobile-projects-section">
    <h1 class="mobile-hero-name">
      <span>Garrett</span>
      <span>Peake.</span>
    </h1>
    <div class="mobile-projects">
      <p class="loading">Loading projects...</p>
    </div>
    <div class="mobile-social">
      <a href="https://github.com/GarrettPeake" target="_blank" rel="noopener" aria-label="GitHub">
        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
      </a>
      <a href="https://www.linkedin.com/in/gepeake" target="_blank" rel="noopener" aria-label="LinkedIn">
        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
      </a>
    </div>
  </div>
`;

// Template is selected dynamically based on layout mode
const template = '';

async function init(container) {
  const layoutMode = getLayoutMode();

  // Inject the correct template based on layout
  if (layoutMode === 'mobile') {
    container.innerHTML = mobileTemplate;
  } else {
    container.innerHTML = desktopTemplate;
  }

  try {
    const res = await fetch('/api/projects');
    if (!res.ok) throw new Error('Failed to load projects');
    projects = await res.json();

    if (layoutMode === 'mobile') {
      renderMobileProjects(container);
    } else {
      renderDesktopProjects(container);
      initShelfSync();
    }
  } catch (err) {
    console.error('Failed to load projects:', err);
    if (layoutMode === 'desktop') {
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
    } else {
      const mobileProjects = container.querySelector('.mobile-projects');
      if (mobileProjects) {
        mobileProjects.innerHTML = '<p class="empty">No projects available</p>';
      }
    }
  }
}

// Desktop rendering
function renderDesktopProjects(container) {
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

  if (descriptionText && projects.length > 0) {
    descriptionText.innerHTML = renderMarkdownSimple(projects[0].description) || 'Select a project';
  }
}

// Mobile rendering
function renderMobileProjects(container) {
  const mobileProjects = container.querySelector('.mobile-projects');
  if (!mobileProjects || projects.length === 0) {
    if (mobileProjects) mobileProjects.innerHTML = '';
    return;
  }

  mobileProjects.innerHTML = projects.map(project => `
    <div class="mobile-project-card" data-url="${escapeAttr(project.url || '#')}">
      <div class="project-icon">
        ${project.iconType === 'svg' ? project.icon : `<img src="${escapeAttr(project.icon)}" alt="">`}
      </div>
      <div class="project-info">
        <h3>${escapeHtml(project.title)}</h3>
        <p class="project-description">${escapeHtml(project.description)}</p>
      </div>
      ${project.url ? `
        <a
          href="${escapeAttr(project.url)}"
          target="_blank"
          rel="noopener"
          class="open-link"
          aria-label="Open in new tab"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      ` : ''}
    </div>
  `).join('');

  initMobileProjectCards(mobileProjects);
}

function initMobileProjectCards(container) {
  container.addEventListener('click', (e) => {
    if (e.target.closest('.open-link')) return;

    const card = e.target.closest('.mobile-project-card');
    if (!card) return;

    const wasExpanded = card.classList.contains('expanded');

    container.querySelectorAll('.mobile-project-card.expanded').forEach(c => {
      c.classList.remove('expanded');
    });

    if (!wasExpanded) {
      card.classList.add('expanded');
    }
  });
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

  let selectedIndex = 0;

  function showDescription(index) {
    const project = projects[index];
    if (project && descriptionText) {
      descriptionText.innerHTML = renderMarkdownSimple(project.description) || '';
    }
  }

  function restoreSelectedDescription() {
    if (selectedIndex !== null && projects[selectedIndex]) {
      showDescription(selectedIndex);
    } else if (descriptionText) {
      descriptionText.innerHTML = 'Select a project';
    }
  }

  shelfItems.addEventListener('mouseover', (e) => {
    const item = e.target.closest('.shelf-item');
    if (!item) return;
    const projectIndex = parseInt(item.dataset.project);
    showDescription(projectIndex);
  });

  shelfItems.addEventListener('mouseout', (e) => {
    const related = e.relatedTarget;
    if (related && shelfItems.contains(related)) return;
    restoreSelectedDescription();
  });

  shelfItems.addEventListener('click', (e) => {
    const item = e.target.closest('.shelf-item');
    if (!item) return;

    const projectIndex = parseInt(item.dataset.project);
    selectedIndex = projectIndex;

    shelfItems.querySelectorAll('.shelf-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');

    showDescription(projectIndex);
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
