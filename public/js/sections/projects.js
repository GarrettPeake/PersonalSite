/**
 * Projects Section Module
 *
 * Desktop: Displays project carousel with shelf sync.
 * Mobile: Displays vertical project cards with expand/collapse.
 */

import { getLayoutMode } from '/js/spa/router.js';
import { escapeHtml, escapeAttr, sanitizeSvg } from '/js/utils.js';

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
      initPieceCarousels();
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
          ${project.iconType === 'svg' ? sanitizeSvg(project.icon) : `<img src="${escapeAttr(project.icon)}" alt="${escapeAttr(project.iconAlt || project.title + ' icon')}">`}
        </div>
        <div class="shelf-item-legend" title="${escapeAttr(project.title)}">${escapeHtml(project.title)}</div>
      </div>
    `).join('');
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
        ${project.iconType === 'svg' ? sanitizeSvg(project.icon) : `<img src="${escapeAttr(project.icon)}" alt="${escapeAttr(project.iconAlt || project.title + ' icon')}" width="48" height="48">`}
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
  const pieces = project.contentPieces || [];
  const hasPieces = pieces.length > 0;
  const hasMultiple = pieces.length > 1;

  let piecesHtml;
  if (!hasPieces) {
    piecesHtml = `
      <div class="piece-viewport">
        <div class="slide-placeholder"><span>No content yet</span></div>
      </div>
    `;
  } else {
    piecesHtml = `
      <div class="piece-viewport">
        ${pieces.map((piece, i) => `
          <div class="piece-slide ${i === 0 ? 'active' : ''}" data-piece="${i}">
            ${piece.type === 'iframe'
              ? `<iframe src="${escapeAttr(piece.url)}" title="${escapeAttr(project.title)}" loading="lazy" tabindex="-1"></iframe>`
              : `<div class="slide-image"><img src="${escapeAttr(piece.url)}" alt="${escapeAttr(piece.description || project.title)}"></div>`
            }
          </div>
        `).join('')}
      </div>
    `;
  }

  const dotsHtml = hasMultiple ? `
    <div class="piece-nav">
      <button class="piece-chevron piece-chevron--left" aria-label="Previous content piece">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div class="piece-dots" role="tablist" aria-label="Content pieces">
        ${pieces.map((_, i) => `<span class="piece-dot ${i === 0 ? 'active' : ''}" data-piece="${i}" role="tab" aria-selected="${i === 0}" aria-label="Content piece ${i + 1} of ${pieces.length}" tabindex="0"></span>`).join('')}
      </div>
      <button class="piece-chevron piece-chevron--right" aria-label="Next content piece">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
  ` : '';

  const firstDescription = hasPieces && pieces[0].description
    ? `<div class="piece-description">${renderMarkdownSimple(pieces[0].description)}</div>`
    : '<div class="piece-description"></div>';

  return `
    <div class="project-header">
      <h2 class="project-title">${escapeHtml(project.title)}</h2>
      <div class="project-desc md-content">${renderMarkdownSimple(project.description)}</div>
    </div>
    <div class="piece-carousel">
      ${piecesHtml}
    </div>
    ${dotsHtml}
    ${firstDescription}
  `;
}

function initPieceCarousels() {
  document.querySelectorAll('.carousel-slide').forEach(slide => {
    const projectIndex = parseInt(slide.dataset.project);
    const project = projects[projectIndex];
    if (!project || !project.contentPieces || project.contentPieces.length <= 1) return;

    const pieces = slide.querySelectorAll('.piece-slide');
    const dots = slide.querySelectorAll('.piece-dot');
    const descEl = slide.querySelector('.piece-description');
    const leftBtn = slide.querySelector('.piece-chevron--left');
    const rightBtn = slide.querySelector('.piece-chevron--right');
    let current = 0;

    function goTo(index) {
      if (index < 0 || index >= pieces.length) return;
      pieces[current].classList.remove('active');
      dots[current].classList.remove('active');
      dots[current].setAttribute('aria-selected', 'false');
      current = index;
      pieces[current].classList.add('active');
      dots[current].classList.add('active');
      dots[current].setAttribute('aria-selected', 'true');
      if (descEl) {
        const desc = project.contentPieces[current].description;
        descEl.innerHTML = desc ? renderMarkdownSimple(desc) : '';
      }
    }

    if (leftBtn) leftBtn.addEventListener('click', (e) => { e.stopPropagation(); goTo(current - 1); });
    if (rightBtn) rightBtn.addEventListener('click', (e) => { e.stopPropagation(); goTo(current + 1); });
    dots.forEach(dot => {
      dot.addEventListener('click', (e) => { e.stopPropagation(); goTo(parseInt(dot.dataset.piece)); });
      dot.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          goTo(parseInt(dot.dataset.piece));
        }
      });
    });
  });
}

function initShelfSync() {
  const shelfItems = document.getElementById('shelf-items');

  if (!shelfItems) return;

  let selectedIndex = 0;

  function activateShelfItem(item) {
    const projectIndex = parseInt(item.dataset.project);
    selectedIndex = projectIndex;

    shelfItems.querySelectorAll('.shelf-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');

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
    .replace(/\[(.+?)\]\((.+?)\)/g, (_, text, url) => {
      const lower = url.trim().toLowerCase();
      if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:'))
        return text;
      return `<a href="${url}" target="_blank" rel="noopener">${text}</a>`;
    });
}

export default {
  template,
  init
};
