// Home Page JavaScript

(function() {
  'use strict';

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

  // Shelf hover functionality
  function initShelf() {
    const shelfItems = document.getElementById('shelf-items');
    const descriptionBox = document.getElementById('shelf-description');
    const carousel = document.getElementById('project-carousel');

    if (!shelfItems || !descriptionBox) return;

    const descriptionText = descriptionBox.querySelector('.description-text');

    // Handle shelf item interactions
    shelfItems.addEventListener('mouseover', (e) => {
      const item = e.target.closest('.shelf-item');
      if (!item) return;

      const description = item.dataset.description;
      if (description && descriptionText) {
        descriptionText.textContent = description;
      }
    });

    shelfItems.addEventListener('mouseout', (e) => {
      const item = e.target.closest('.shelf-item');
      if (!item) return;

      // Reset to active item's description or default
      const activeItem = shelfItems.querySelector('.shelf-item.active');
      if (activeItem && descriptionText) {
        descriptionText.textContent = activeItem.dataset.description || 'Select a project';
      } else if (descriptionText) {
        descriptionText.textContent = 'Hover over a project to see details';
      }
    });

    shelfItems.addEventListener('click', (e) => {
      const item = e.target.closest('.shelf-item');
      if (!item) return;

      // Update active state
      shelfItems.querySelectorAll('.shelf-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      // Update description
      if (descriptionText) {
        descriptionText.textContent = item.dataset.description || '';
      }

      // Update carousel if present
      if (carousel) {
        const projectId = item.dataset.project;
        updateCarousel(projectId);
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

  // Project URL data (you can extend this with actual project URLs)
  const projectData = {
    0: { url: null, type: 'placeholder' },
    1: { url: null, type: 'placeholder' },
    2: { url: null, type: 'placeholder' },
    3: { url: null, type: 'placeholder' }
  };

  // Initialize carousel slides
  function initCarousel() {
    const track = document.querySelector('.carousel-track');
    if (!track) return;

    // Create slides for each project
    const existingSlide = track.querySelector('.carousel-slide');

    Object.keys(projectData).forEach((id, index) => {
      if (index === 0) return; // First slide already exists

      const slide = document.createElement('div');
      slide.className = 'carousel-slide';
      slide.dataset.project = id;

      const project = projectData[id];
      if (project.url) {
        slide.innerHTML = `<iframe src="${project.url}" title="Project preview"></iframe>`;
      } else {
        slide.innerHTML = `
          <div class="slide-placeholder">
            <span>Project preview</span>
          </div>
        `;
      }

      track.appendChild(slide);
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

  // Initialize all functionality
  function init() {
    initThemeToggle();
    initMobileMenu();
    initShelf();
    initCarousel();
    initCarouselNavigation();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
