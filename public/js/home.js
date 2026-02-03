// Home Page JavaScript

(function() {
  'use strict';

  // Theme toggle functionality
  function initThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const mobileThemeToggle = document.getElementById('mobile-theme-toggle');

    function updateToggleLabels(theme) {
      const nextTheme = theme === 'dark' ? 'light' : 'dark';
      const label = 'Toggle theme: switch to ' + nextTheme + ' mode';
      if (themeToggle) themeToggle.setAttribute('aria-label', label);
      if (mobileThemeToggle) mobileThemeToggle.setAttribute('aria-label', label);
    }

    function toggleTheme() {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      updateToggleLabels(next);
    }

    function handleToggleKeydown(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleTheme();
      }
    }

    if (themeToggle) {
      themeToggle.addEventListener('click', toggleTheme);
      themeToggle.addEventListener('keydown', handleToggleKeydown);
    }

    if (mobileThemeToggle) {
      mobileThemeToggle.addEventListener('click', toggleTheme);
      mobileThemeToggle.addEventListener('keydown', handleToggleKeydown);
    }

    // Set initial aria-label based on current theme
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    updateToggleLabels(currentTheme);
  }

  // Mobile menu functionality
  function initMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');

    if (!menuBtn || !menu) return;

    // Set initial tabindex on menu links so they are not focusable when menu is closed
    function setMenuLinksFocusable(focusable) {
      const links = menu.querySelectorAll('a, [tabindex]');
      links.forEach(link => {
        if (focusable) {
          link.removeAttribute('tabindex');
        } else {
          link.setAttribute('tabindex', '-1');
        }
      });
      if (focusable) {
        menu.removeAttribute('aria-hidden');
      } else {
        menu.setAttribute('aria-hidden', 'true');
      }
    }

    // Menu starts closed
    setMenuLinksFocusable(false);

    menuBtn.addEventListener('click', () => {
      const isOpen = menu.classList.toggle('open');
      menuBtn.classList.toggle('open', isOpen);
      menuBtn.setAttribute('aria-expanded', isOpen);
      setMenuLinksFocusable(isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('open')) {
        menu.classList.remove('open');
        menuBtn.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
        setMenuLinksFocusable(false);
        document.body.style.overflow = '';
        menuBtn.focus();
      }
    });
  }

  // Mark the inactive layout as inert so its elements are removed from
  // the accessibility tree and Tab order regardless of CSS display state.
  function initLayoutInert() {
    var SPA_BREAKPOINT = 900;
    var desktopLayout = document.querySelector('.desktop-layout');
    var mobileLayout = document.querySelector('.mobile-layout');

    function updateInert() {
      var isDesktop = window.innerWidth >= SPA_BREAKPOINT;
      if (desktopLayout) {
        desktopLayout.inert = !isDesktop;
        desktopLayout.setAttribute('aria-hidden', String(!isDesktop));
      }
      if (mobileLayout) {
        mobileLayout.inert = isDesktop;
        mobileLayout.setAttribute('aria-hidden', String(isDesktop));
      }
    }

    updateInert();
    window.addEventListener('resize', updateInert);
  }

  // Initialize all functionality
  function init() {
    initLayoutInert();
    initThemeToggle();
    initMobileMenu();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
