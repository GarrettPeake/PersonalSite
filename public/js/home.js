// Home Page JavaScript

(function() {
  'use strict';

  // State
  let projects = [];

  // Check if we're in SPA mode (desktop)
  const isSPAMode = window.innerWidth >= 900;

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

  // Fetch projects from API (for mobile only - SPA handles desktop)
  async function loadMobileProjects() {
    // Skip if in SPA mode - SPA router handles projects
    if (isSPAMode) return;

    try {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('Failed to load projects');
      projects = await res.json();
      renderMobileProjects();
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  }

  // Render projects to mobile layout
  function renderMobileProjects() {
    const mobileProjects = document.querySelector('.mobile-projects');
    if (!mobileProjects || projects.length === 0) return;

    mobileProjects.innerHTML = projects.map(project => `
      <div class="mobile-project-card" data-url="${escapeAttr(project.url || '#')}">
        <div class="project-icon">
          ${project.iconType === 'svg' ? project.icon : `<img src="${escapeAttr(project.icon)}" alt="">`}
        </div>
        <div class="project-info">
          <h3>${escapeHtml(project.title)}</h3>
          <p>${escapeHtml(project.description)}</p>
        </div>
        ${project.url ? `
          <a
            href="${escapeAttr(project.url)}"
            target="_blank"
            rel="noopener"
            class="open-link"
            aria-label="Open in new tab"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
              />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        ` : ''}
      </div>
    `).join('');
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
    loadMobileProjects();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
