// Home Page JavaScript

(function() {
  'use strict';

  // State
  let projects = [];

  // Theme toggle functionality
  function initThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const mobileThemeToggle = document.getElementById('mobile-theme-toggle');

    function toggleTheme() {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    }

    if (themeToggle) {
      themeToggle.addEventListener('click', toggleTheme);
    }

    if (mobileThemeToggle) {
      mobileThemeToggle.addEventListener('click', toggleTheme);
    }
  }

  // Mobile menu functionality
  function initMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');

    if (!menuBtn || !menu) return;

    menuBtn.addEventListener('click', () => {
      const isOpen = menu.classList.toggle('open');
      menuBtn.classList.toggle('open', isOpen);
      menuBtn.setAttribute('aria-expanded', isOpen);
    });
  }

  // Fetch projects from API
  async function loadProjects() {
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('Failed to load projects');
      projects = await res.json();
      renderProjects();
    } catch (err) {
      console.error('Failed to load projects:', err);
      // Show fallback message
      const shelfItems = document.getElementById('shelf-items');
      if (shelfItems) {
        shelfItems.innerHTML = '<p class="shelf-empty">No projects available</p>';
      }
    }
  }

  // Render projects to shelf and carousel
  function renderProjects() {
    const shelfItems = document.getElementById('shelf-items');
    const carouselTrack = document.querySelector('.carousel-track');

    if (!shelfItems) return;

    if (projects.length === 0) {
      shelfItems.innerHTML = '<p class="shelf-empty">No projects yet</p>';
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

    // Render shelf items
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

    // Render carousel slides
    if (carouselTrack) {
      carouselTrack.innerHTML = projects.map((project, index) => {
        const content = renderCarouselContent(project, index);
        return `
          <div class="carousel-slide ${index === 0 ? 'active' : ''}" data-project="${index}">
            ${content}
          </div>
        `;
      }).join('');
    }

    // Set initial description
    const descriptionText = document.querySelector('.description-text');
    if (descriptionText && projects.length > 0) {
      descriptionText.innerHTML = renderMarkdownSimple(projects[0].description) || 'Select a project';
    }

    // Initialize shelf interactions
    initShelf();
  }

  // Render carousel content for a project
  function renderCarouselContent(project, index) {
    if (!project.contentPieces || project.contentPieces.length === 0) {
      return `
        <div class="slide-placeholder">
          <span>${escapeHtml(project.title)}</span>
        </div>
      `;
    }

    // Show first content piece
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

  // Simple markdown renderer for descriptions (bold, italic, links)
  function renderMarkdownSimple(text) {
    if (!text) return '';
    return escapeHtml(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }

  // Shelf hover functionality
  function initShelf() {
    const shelfItems = document.getElementById('shelf-items');
    const descriptionBox = document.getElementById('shelf-description');
    const carousel = document.getElementById('project-carousel');

    if (!shelfItems || !descriptionBox) return;

    const descriptionText = descriptionBox.querySelector('.description-text');

    // Remove existing listeners by cloning (simple approach)
    const newShelfItems = shelfItems.cloneNode(true);
    shelfItems.parentNode.replaceChild(newShelfItems, shelfItems);

    // Handle shelf item interactions
    newShelfItems.addEventListener('mouseover', (e) => {
      const item = e.target.closest('.shelf-item');
      if (!item) return;

      const projectIndex = parseInt(item.dataset.project);
      const project = projects[projectIndex];
      if (project && descriptionText) {
        descriptionText.innerHTML = renderMarkdownSimple(project.description) || '';
      }
    });

    newShelfItems.addEventListener('mouseout', (e) => {
      const item = e.target.closest('.shelf-item');
      if (!item) return;

      // Reset to active item's description or default
      const activeItem = newShelfItems.querySelector('.shelf-item.active');
      if (activeItem && descriptionText) {
        const activeIndex = parseInt(activeItem.dataset.project);
        const project = projects[activeIndex];
        descriptionText.innerHTML = project ? renderMarkdownSimple(project.description) : 'Select a project';
      } else if (descriptionText) {
        descriptionText.innerHTML = 'Hover over a project to see details';
      }
    });

    newShelfItems.addEventListener('click', (e) => {
      const item = e.target.closest('.shelf-item');
      if (!item) return;

      // Update active state
      newShelfItems.querySelectorAll('.shelf-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      // Update description
      const projectIndex = parseInt(item.dataset.project);
      const project = projects[projectIndex];
      if (project && descriptionText) {
        descriptionText.innerHTML = renderMarkdownSimple(project.description) || '';
      }

      // Update carousel if present
      if (carousel) {
        updateCarousel(item.dataset.project);
      }
    });
  }

  // Carousel functionality
  function updateCarousel(projectId) {
    const track = document.querySelector('.carousel-track');
    if (!track) return;

    const slides = track.querySelectorAll('.carousel-slide');

    // Animate carousel transition
    slides.forEach(slide => {
      slide.classList.remove('active');
      if (slide.dataset.project === projectId) {
        // Short delay for fade effect
        setTimeout(() => {
          slide.classList.add('active');
        }, 150);
      }
    });
  }

  // Handle carousel click to navigate to project
  function initCarouselNavigation() {
    const carousel = document.getElementById('project-carousel');
    if (!carousel) return;

    carousel.addEventListener('click', () => {
      const activeItem = document.querySelector('.shelf-item.active');
      if (activeItem && activeItem.dataset.url) {
        window.location.href = activeItem.dataset.url;
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

  // Initialize all functionality
  function init() {
    initThemeToggle();
    initMobileMenu();
    initCarouselNavigation();
    loadProjects();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
