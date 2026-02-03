/**
 * Projects Section Module
 *
 * Desktop: Displays project carousel with shelf sync.
 * Mobile: Displays vertical project cards with expand/collapse.
 */

import { getLayoutMode } from '/js/spa/router.js';
import { escapeHtml, escapeAttr } from '/js/utils.js';

let projects = [];

const desktopTemplate = `
  <div class="project-display">
    <div class="project-frame">
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
    <div class="mobile-hero-name" aria-hidden="true">
      <span>Garrett</span>
      <span>Peake.</span>
    </div>
    <div class="mobile-projects">
      <p class="loading">Loading projects...</p>
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
        data-title="${escapeAttr(project.title)}"
        data-description="${escapeAttr(project.description)}"
        tabindex="0"
        role="button"
        aria-label="${escapeAttr(project.title)}"
      >
        <div class="shelf-item-icon">
          ${project.iconType === 'svg' ? project.icon : `<img src="${escapeAttr(project.icon)}" alt="${escapeAttr(project.iconAlt || project.title + ' icon')}">`}
        </div>
        <div class="shelf-item-legend" title="${escapeAttr(project.title)}">${escapeHtml(project.title)}</div>
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

  mobileProjects.innerHTML = projects.map(project => {
    const hasValidUrl = project.url && project.url !== '#';
    return `
    <div class="mobile-project-card" tabindex="0" role="button" aria-label="${escapeAttr(project.title)}">
      <div class="project-icon">
        ${project.iconType === 'svg' ? project.icon : `<img src="${escapeAttr(project.icon)}" alt="${escapeAttr(project.iconAlt || project.title + ' icon')}" width="48" height="48">`}
      </div>
      <div class="project-info">
        <h2>${escapeHtml(project.title)}</h2>
        <p class="project-description md-content">${renderMarkdownSimple(project.description)}</p>
        ${project.contentPieces && project.contentPieces.length > 0 ? `
          <div class="project-content-pieces">
            ${project.contentPieces.map(piece => {
              if (piece.type === 'iframe') {
                return `<div class="content-piece-container"><iframe src="${escapeAttr(piece.url)}" title="${escapeAttr(piece.description || project.title)}" loading="lazy" tabindex="-1"></iframe></div>`;
              } else {
                return `<div class="content-piece-container"><img src="${escapeAttr(piece.url)}" alt="${escapeAttr(piece.description || project.title)}" loading="lazy"></div>`;
              }
            }).join('')}
          </div>
        ` : ''}
      </div>
      ${hasValidUrl ? `
        <a
          href="${escapeAttr(project.url)}"
          target="_blank"
          rel="noopener"
          class="open-link"
          aria-label="Open ${escapeAttr(project.title)} in new tab"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      ` : ''}
    </div>
  `;
  }).join('');

  initMobileProjectCards(mobileProjects);
}

function initMobileProjectCards(container) {
  function toggleCard(card) {
    const wasExpanded = card.classList.contains('expanded');

    container.querySelectorAll('.mobile-project-card.expanded').forEach(c => {
      c.classList.remove('expanded');
    });

    if (!wasExpanded) {
      card.classList.add('expanded');
    }
  }

  container.addEventListener('click', (e) => {
    if (e.target.closest('.open-link')) return;

    const card = e.target.closest('.mobile-project-card');
    if (!card) return;
    toggleCard(card);
  });

  container.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (e.target.closest('.open-link')) return;

    const card = e.target.closest('.mobile-project-card');
    if (!card) return;
    e.preventDefault();
    toggleCard(card);
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
    return `<iframe src="${escapeAttr(piece.url)}" title="${escapeAttr(project.title)}" loading="lazy" tabindex="-1"></iframe>`;
  } else {
    return `
      <div class="slide-image">
        <img src="${escapeAttr(piece.url)}" alt="${escapeAttr(piece.description || project.title)}">
      </div>
      ${piece.description ? `<div class="slide-caption">${renderMarkdownSimple(piece.description)}</div>` : ''}
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

  function activateShelfItem(item) {
    const projectIndex = parseInt(item.dataset.project);
    selectedIndex = projectIndex;

    shelfItems.querySelectorAll('.shelf-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');

    showDescription(projectIndex);
    updateCarousel(item.dataset.project);
  }

  shelfItems.addEventListener('click', (e) => {
    const item = e.target.closest('.shelf-item');
    if (!item) return;
    activateShelfItem(item);
  });

  shelfItems.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const item = e.target.closest('.shelf-item');
    if (!item) return;
    e.preventDefault();
    activateShelfItem(item);
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
