/**
 * SPA Router
 *
 * Client-side router for desktop SPA navigation.
 * Uses History API for navigation between sections.
 * Only initializes on desktop (900px+).
 */

class SPARouter {
  routes = {
    '/': 'projects',
    '/projects': 'projects',
    '/blog': 'blog',
    '/about': 'about',
    '/photography': 'photography'
  };

  sectionOrder = ['projects', 'blog', 'about', 'photography'];
  currentSection = null;
  loadedSections = {};
  isTransitioning = false;

  constructor() {
    this.spaContent = null;
    this.rightPanel = null;
    this.shelfPanel = null;
  }

  init() {
    this.spaContent = document.getElementById('spa-content');
    this.rightPanel = document.querySelector('.right-panel');
    this.shelfPanel = document.querySelector('.shelf-panel');

    if (!this.spaContent) {
      console.error('SPA content container not found');
      return;
    }

    // Check for redirect from other pages
    const redirectPath = sessionStorage.getItem('spa-redirect');
    if (redirectPath) {
      sessionStorage.removeItem('spa-redirect');
      // Update URL without reload
      history.replaceState(null, '', redirectPath);
    }

    // Parse initial URL and set section
    const path = window.location.pathname;
    let initialSection = this.routes[path] || 'projects';
    let initialBlogSlug = null;

    // Check if this is a direct link to a blog post
    const blogPostMatch = path.match(/^\/blog\/(.+)$/);
    if (blogPostMatch) {
      initialSection = 'blog';
      initialBlogSlug = blogPostMatch[1];
    }

    // Bind popstate for browser back/forward
    window.addEventListener('popstate', (e) => {
      const section = e.state?.section || this.routes[window.location.pathname] || 'projects';
      this.showSection(section, false);

      // Close blog modal if we navigated away from a blog post
      if (!e.state?.slug) {
        const blogModal = document.querySelector('gp-blog-modal');
        if (blogModal && blogModal.hasAttribute('open')) {
          blogModal.close();
        }
      }
    });

    // Listen for blog modal close events
    document.addEventListener('blog-modal-close', () => {
      // Update URL to /blog when modal closes
      if (window.location.pathname.startsWith('/blog/')) {
        history.pushState({ section: 'blog' }, '', '/blog');
      }
    });

    // Intercept nav link clicks
    this.setupNavigation();

    // Load and show initial section
    this.showSection(initialSection, false).then(() => {
      // If this was a direct link to a blog post, open it
      if (initialBlogSlug) {
        const blogModal = document.querySelector('gp-blog-modal');
        if (blogModal) {
          blogModal.open(initialBlogSlug);
        }
      }
    });

    // Replace state with section info
    history.replaceState({ section: initialSection, slug: initialBlogSlug }, '', window.location.pathname);
  }

  setupNavigation() {
    // Handle all nav links with data-section
    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-spa-link]');
      if (!link) return;

      e.preventDefault();
      const href = link.getAttribute('href');
      this.navigate(href);
    });
  }

  navigate(url, pushState = true) {
    const section = this.routes[url];
    if (!section) {
      // Not an SPA route, do normal navigation
      window.location.href = url;
      return;
    }

    if (pushState) {
      history.pushState({ section }, '', url);
    }

    this.showSection(section, true);

    // Track page view
    const tracker = document.querySelector('gp-tracker');
    if (tracker && tracker.trackPageView) {
      tracker.trackPageView(url);
    }
  }

  getDirection(fromSection, toSection) {
    const fromIndex = this.sectionOrder.indexOf(fromSection);
    const toIndex = this.sectionOrder.indexOf(toSection);
    return toIndex > fromIndex ? 'forward' : 'backward';
  }

  async showSection(name, animate = true) {
    if (this.currentSection === name || this.isTransitioning) return;

    this.isTransitioning = true;
    const direction = this.currentSection ? this.getDirection(this.currentSection, name) : null;
    const previousSection = this.currentSection;

    // Load section if not already loaded
    if (!this.loadedSections[name]) {
      await this.loadSection(name);
    }

    // Get section elements
    const currentEl = previousSection ? this.spaContent.querySelector(`[data-section="${previousSection}"]`) : null;
    const newEl = this.spaContent.querySelector(`[data-section="${name}"]`);

    if (!newEl) {
      this.isTransitioning = false;
      return;
    }

    // Update nav active state
    this.updateNavActiveState(name);

    // Update shelf panel visibility
    this.updateShelfVisibility(name);

    if (animate && currentEl && direction) {
      // Set up transition classes
      const exitClass = direction === 'forward' ? 'exit-left' : 'exit-right';
      const enterClass = direction === 'forward' ? 'enter-right' : 'enter-left';

      // Position new section for entry WITHOUT animation
      newEl.style.transition = 'none';
      newEl.classList.add(enterClass);
      newEl.classList.add('active');

      // Trigger reflow to apply position immediately
      newEl.offsetHeight;

      // Re-enable transitions
      newEl.style.transition = '';

      // Trigger another reflow
      newEl.offsetHeight;

      // Start exit animation on current
      currentEl.classList.add(exitClass);
      currentEl.classList.remove('active');

      // Start enter animation on new (animate to center)
      newEl.classList.remove(enterClass);

      // Wait for transition to complete
      await new Promise(resolve => setTimeout(resolve, 400));

      // Clean up and unload previous section
      currentEl.classList.remove(exitClass);
      this.unloadSection(previousSection);
    } else {
      // No animation - just swap
      if (currentEl) {
        currentEl.classList.remove('active');
        this.unloadSection(previousSection);
      }
      newEl.classList.add('active');
    }

    this.currentSection = name;
    this.isTransitioning = false;
  }

  unloadSection(name) {
    if (!name) return;

    const sectionEl = this.spaContent.querySelector(`[data-section="${name}"]`);
    if (sectionEl) {
      sectionEl.remove();
    }
    delete this.loadedSections[name];
  }

  async loadSection(name) {
    try {
      const module = await import(`/js/sections/${name}.js`);

      // Create section container
      const sectionEl = document.createElement('div');
      sectionEl.className = 'spa-section';
      sectionEl.setAttribute('data-section', name);
      sectionEl.innerHTML = module.default.template;

      this.spaContent.appendChild(sectionEl);

      // Initialize section
      if (module.default.init) {
        await module.default.init(sectionEl);
      }

      this.loadedSections[name] = true;
    } catch (err) {
      console.error(`Failed to load section: ${name}`, err);
    }
  }

  updateNavActiveState(section) {
    // Map section to URL for comparison
    const sectionToUrl = {
      'projects': ['/', '/projects'],
      'blog': ['/blog'],
      'about': ['/about'],
      'photography': ['/photography']
    };

    const urls = sectionToUrl[section] || [];

    document.querySelectorAll('.hero-nav .nav-link').forEach(link => {
      const href = link.getAttribute('href');
      if (urls.includes(href)) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  updateShelfVisibility(section) {
    if (!this.rightPanel || !this.shelfPanel) return;

    if (section === 'projects') {
      this.rightPanel.classList.remove('collapsed');
    } else {
      this.rightPanel.classList.add('collapsed');
    }
  }

  // Open blog post modal
  async openBlogPost(slug) {
    // Navigate to blog section if not there
    if (this.currentSection !== 'blog') {
      await this.navigate('/blog', false);
    }

    // Update URL
    history.pushState({ section: 'blog', slug }, '', `/blog/${slug}`);

    // Open modal
    const blogModal = document.querySelector('gp-blog-modal');
    if (blogModal) {
      blogModal.open(slug);
    }

    // Track page view
    const tracker = document.querySelector('gp-tracker');
    if (tracker && tracker.trackPageView) {
      tracker.trackPageView(`/blog/${slug}`);
    }
  }

  // Close blog post modal (called programmatically, not from modal's close button)
  closeBlogPost() {
    const blogModal = document.querySelector('gp-blog-modal');
    if (blogModal && blogModal.hasAttribute('open')) {
      blogModal.close();
    }
  }
}

// Export singleton instance
const router = new SPARouter();

export function init() {
  router.init();
}

export function navigate(url) {
  router.navigate(url);
}

export function openBlogPost(slug) {
  router.openBlogPost(slug);
}

export function closeBlogPost() {
  router.closeBlogPost();
}

export default router;
