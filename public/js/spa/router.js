/**
 * SPA Router
 *
 * Client-side router for both desktop and mobile SPA navigation.
 * Uses History API for navigation between sections.
 * Desktop: carousel transitions, shelf management, blog modal.
 * Mobile: simple content swaps, inline blog post rendering.
 */

const SPA_BREAKPOINT = 900;

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
  initialized = false;
  layoutMode = null; // 'desktop' | 'mobile'

  constructor() {
    this.spaContent = null;
    this.rightPanel = null;
    this.shelfPanel = null;
    this._popstateHandler = null;
    this._blogModalCloseHandler = null;
    this._clickHandler = null;
    this._resizeHandler = null;
  }

  init() {
    // Prevent double-initialization
    if (this.initialized) return;

    this.layoutMode = window.innerWidth >= SPA_BREAKPOINT ? 'desktop' : 'mobile';

    if (this.layoutMode === 'desktop') {
      this.spaContent = document.getElementById('spa-content');
      this.rightPanel = document.querySelector('.right-panel');
      this.shelfPanel = document.querySelector('.shelf-panel');
    } else {
      this.spaContent = document.getElementById('mobile-spa-content');
    }

    if (!this.spaContent) {
      console.error('SPA content container not found');
      return;
    }

    // Check for redirect from other pages
    const redirectPath = sessionStorage.getItem('spa-redirect');
    if (redirectPath) {
      sessionStorage.removeItem('spa-redirect');
      history.replaceState(null, '', redirectPath);
    }

    // Parse initial URL and set section
    const path = window.location.pathname;
    const { section: initialSection, slug: initialBlogSlug, token: initialDraftToken } = this.resolveRoute(path);

    // Bind popstate for browser back/forward
    this._popstateHandler = (e) => {
      const path = window.location.pathname;
      const { section, slug, token } = this.resolveRoute(path);

      // Close blog modal if we navigated away from a blog post on desktop
      if (this.layoutMode === 'desktop' && !slug) {
        const blogModal = document.querySelector('gp-blog-modal');
        if (blogModal && blogModal.hasAttribute('open')) {
          blogModal.close();
        }
      }

      if (section === 'blog-post') {
        this.showBlogPost(slug, false);
      } else if (section === 'draft-preview') {
        this.showDraftPreview(token, false);
      } else {
        this.showSection(section, false);
      }
    };
    window.addEventListener('popstate', this._popstateHandler);

    // Listen for blog modal close events (desktop only)
    if (this.layoutMode === 'desktop') {
      this._blogModalCloseHandler = () => {
        if (window.location.pathname.startsWith('/blog/')) {
          history.pushState({ section: 'blog' }, '', '/blog');
          this.updateDocumentTitle('blog');
        }
      };
      document.addEventListener('blog-modal-close', this._blogModalCloseHandler);
    }

    // Intercept nav link clicks
    this.setupNavigation();

    // Handle resize across the breakpoint
    this._resizeHandler = this.createResizeHandler();
    window.addEventListener('resize', this._resizeHandler);

    this.initialized = true;

    // Load and show initial section
    if (initialSection === 'blog-post' && initialBlogSlug) {
      this.showBlogPost(initialBlogSlug, false);
    } else if (initialSection === 'draft-preview' && initialDraftToken) {
      this.showDraftPreview(initialDraftToken, false);
    } else {
      this.showSection(initialSection, false).then(() => {
        document.documentElement.removeAttribute('data-initial-section');
        // Desktop: if this was a direct link to a blog post, open modal
        if (this.layoutMode === 'desktop' && initialBlogSlug) {
          const blogModal = document.querySelector('gp-blog-modal');
          if (blogModal) {
            blogModal.open(initialBlogSlug);
          }
        }
      });
    }

    // Replace state with section info
    history.replaceState(
      { section: initialSection, slug: initialBlogSlug, token: initialDraftToken },
      '',
      window.location.pathname
    );
  }

  destroy() {
    if (!this.initialized) return;

    if (this._popstateHandler) {
      window.removeEventListener('popstate', this._popstateHandler);
      this._popstateHandler = null;
    }
    if (this._blogModalCloseHandler) {
      document.removeEventListener('blog-modal-close', this._blogModalCloseHandler);
      this._blogModalCloseHandler = null;
    }
    if (this._clickHandler) {
      document.removeEventListener('click', this._clickHandler);
      this._clickHandler = null;
    }
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
      this._resizeHandler = null;
    }

    if (this.spaContent) {
      this.spaContent.innerHTML = '';
    }

    this.currentSection = null;
    this.loadedSections = {};
    this.isTransitioning = false;
    this.initialized = false;
    this.layoutMode = null;
  }

  /** Returns the current section name */
  getCurrentSection() {
    return this.currentSection;
  }

  /** Resolve a URL path to a section name and optional params */
  resolveRoute(path) {
    // Blog post: /blog/:slug
    const blogPostMatch = path.match(/^\/blog\/(.+)$/);
    if (blogPostMatch) {
      // On desktop, blog posts open as modal over the blog section
      if (this.layoutMode === 'desktop') {
        return { section: 'blog', slug: blogPostMatch[1], token: null };
      }
      // On mobile, blog posts are their own section
      return { section: 'blog-post', slug: blogPostMatch[1], token: null };
    }

    // Draft preview: /draft/share/:token
    const draftMatch = path.match(/^\/draft\/share\/(.+)$/);
    if (draftMatch) {
      return { section: 'draft-preview', slug: null, token: draftMatch[1] };
    }

    // Standard routes
    const section = this.routes[path] || 'not-found';
    return { section, slug: null, token: null };
  }

  createResizeHandler() {
    let resizeTimer;
    let wasDesktop = this.layoutMode === 'desktop';

    return () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const isDesktop = window.innerWidth >= SPA_BREAKPOINT;
        if (isDesktop === wasDesktop) return;
        wasDesktop = isDesktop;

        // Layout mode changed — tear down and reinitialize
        const currentPath = window.location.pathname;
        this.destroy();
        this.init();
      }, 150);
    };
  }

  setupNavigation() {
    this._clickHandler = (e) => {
      const link = e.target.closest('[data-spa-link]');
      if (!link) return;

      e.preventDefault();
      const href = link.getAttribute('href');
      this.navigate(href);

      // Close mobile menu if open
      const menu = document.getElementById('mobile-menu');
      const menuBtn = document.getElementById('mobile-menu-btn');
      if (menu && menu.classList.contains('open')) {
        menu.classList.remove('open');
        if (menuBtn) {
          menuBtn.classList.remove('open');
          menuBtn.setAttribute('aria-expanded', 'false');
        }
      }
    };
    document.addEventListener('click', this._clickHandler);
  }

  navigate(url, pushState = true) {
    const { section, slug, token } = this.resolveRoute(url);

    if (section === 'not-found' && !url.startsWith('/draft') && !url.startsWith('/blog')) {
      // Not an SPA route, do normal navigation
      window.location.href = url;
      return;
    }

    // Close blog modal if open before navigating
    if (this.layoutMode === 'desktop') {
      this.closeBlogPost();
    }

    if (section === 'blog-post' && slug) {
      this.showBlogPost(slug, true);
      return;
    }

    if (section === 'draft-preview' && token) {
      this.showDraftPreview(token, true);
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

    // Update document title
    this.updateDocumentTitle(name);

    // Update shelf panel visibility (desktop only)
    if (this.layoutMode === 'desktop') {
      this.updateShelfVisibility(name);
    }

    // Desktop: carousel transitions
    if (this.layoutMode === 'desktop' && animate && currentEl && direction) {
      const exitClass = direction === 'forward' ? 'exit-left' : 'exit-right';
      const enterClass = direction === 'forward' ? 'enter-right' : 'enter-left';

      newEl.style.transition = 'none';
      newEl.classList.add(enterClass);
      newEl.classList.add('active');
      newEl.offsetHeight;
      newEl.style.transition = '';
      newEl.offsetHeight;

      currentEl.classList.add(exitClass);
      currentEl.classList.remove('active');
      newEl.classList.remove(enterClass);

      await new Promise(resolve => setTimeout(resolve, 400));

      currentEl.classList.remove(exitClass);
      this.unloadSection(previousSection);
    } else {
      // Mobile or no animation: simple swap
      if (currentEl) {
        currentEl.classList.remove('active');
        this.unloadSection(previousSection);
      }
      newEl.classList.add('active');
    }

    this.currentSection = name;
    this.isTransitioning = false;

    // Scroll to top on mobile when switching sections
    if (this.layoutMode === 'mobile') {
      this.spaContent.scrollTop = 0;
      window.scrollTo(0, 0);
    }
  }

  /** Show a blog post (mobile: inline section, desktop: modal) */
  async showBlogPost(slug, pushState = true) {
    if (this.layoutMode === 'desktop') {
      // Desktop: navigate to blog section if needed, then open modal
      if (this.currentSection !== 'blog') {
        await this.showSection('blog', false);
      }

      if (pushState) {
        history.pushState({ section: 'blog', slug }, '', `/blog/${slug}`);
      }

      const blogModal = document.querySelector('gp-blog-modal');
      if (blogModal) {
        blogModal.open(slug);
      }
    } else {
      // Mobile: load blog-post section inline
      if (pushState) {
        history.pushState({ section: 'blog-post', slug }, '', `/blog/${slug}`);
      }

      // Unload current section
      if (this.currentSection) {
        const currentEl = this.spaContent.querySelector(`[data-section="${this.currentSection}"]`);
        if (currentEl) {
          currentEl.classList.remove('active');
          this.unloadSection(this.currentSection);
        }
      }

      // Load blog-post section with slug param
      await this.loadSection('blog-post', { slug });
      const newEl = this.spaContent.querySelector('[data-section="blog-post"]');
      if (newEl) {
        newEl.classList.add('active');
      }
      this.currentSection = 'blog-post';
      window.scrollTo(0, 0);
    }

    // Track page view
    const tracker = document.querySelector('gp-tracker');
    if (tracker && tracker.trackPageView) {
      tracker.trackPageView(`/blog/${slug}`);
    }
  }

  /** Show a draft preview */
  async showDraftPreview(token, pushState = true) {
    if (pushState) {
      history.pushState({ section: 'draft-preview', token }, '', `/draft/share/${token}`);
    }

    // Unload current section
    if (this.currentSection) {
      const currentEl = this.spaContent.querySelector(`[data-section="${this.currentSection}"]`);
      if (currentEl) {
        currentEl.classList.remove('active');
        this.unloadSection(this.currentSection);
      }
    }

    await this.loadSection('draft-preview', { token });
    const newEl = this.spaContent.querySelector('[data-section="draft-preview"]');
    if (newEl) {
      newEl.classList.add('active');
    }
    this.currentSection = 'draft-preview';

    if (this.layoutMode === 'mobile') {
      window.scrollTo(0, 0);
    }

    // Track page view
    const tracker = document.querySelector('gp-tracker');
    if (tracker && tracker.trackPageView) {
      tracker.trackPageView(`/draft/share/${token}`);
    }
  }

  unloadSection(name) {
    if (!name) return;

    const sectionEl = this.spaContent.querySelector(`[data-section="${name}"]`);
    if (sectionEl) {
      sectionEl.remove();
    }
    delete this.loadedSections[name];
  }

  async loadSection(name, params = {}) {
    try {
      // Handle not-found as a built-in section
      if (name === 'not-found') {
        const sectionEl = document.createElement('div');
        sectionEl.className = 'spa-section';
        sectionEl.setAttribute('data-section', 'not-found');
        sectionEl.innerHTML = `
          <div class="not-found-content">
            <p class="not-found-code">404</p>
            <h1 class="not-found-title">Page not found</h1>
            <p class="not-found-path">${window.location.pathname}</p>
            <p class="not-found-message">The page you are looking for does not exist or has been moved.</p>
            <a href="/" class="btn btn--primary" data-spa-link>Back to home</a>
          </div>`;
        this.spaContent.appendChild(sectionEl);
        this.loadedSections[name] = true;
        return;
      }

      const module = await import(`/js/sections/${name}.js`);

      const sectionEl = document.createElement('div');
      sectionEl.className = 'spa-section';
      sectionEl.setAttribute('data-section', name);
      sectionEl.innerHTML = module.default.template;

      this.spaContent.appendChild(sectionEl);

      if (module.default.init) {
        await module.default.init(sectionEl, params);
      }

      this.loadedSections[name] = true;
    } catch (err) {
      console.error(`Failed to load section: ${name}`, err);
    }
  }

  updateNavActiveState(section) {
    const sectionToUrl = {
      'projects': ['/', '/projects'],
      'blog': ['/blog'],
      'about': ['/about'],
      'photography': ['/photography']
    };

    const urls = sectionToUrl[section] || [];

    // Desktop nav
    document.querySelectorAll('.hero-nav .nav-link').forEach(link => {
      const href = link.getAttribute('href');
      if (urls.includes(href)) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Mobile nav
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
      const href = link.getAttribute('href');
      if (urls.includes(href)) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  updateDocumentTitle(section) {
    const titles = {
      'projects': 'Garrett Peake',
      'blog': 'Blog | Garrett Peake',
      'about': 'About | Garrett Peake',
      'photography': 'Photography | Garrett Peake',
      'not-found': '404 | Garrett Peake'
    };
    document.title = titles[section] || 'Garrett Peake';
  }

  updateShelfVisibility(section) {
    if (!this.rightPanel || !this.shelfPanel) return;

    if (section === 'projects') {
      this.rightPanel.classList.remove('collapsed');
    } else {
      this.rightPanel.classList.add('collapsed');
    }
  }

  // Open blog post modal (desktop)
  async openBlogPost(slug) {
    await this.showBlogPost(slug, true);
  }

  // Close blog post modal (called programmatically)
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

export function destroy() {
  router.destroy();
}

export function getCurrentSection() {
  return router.getCurrentSection();
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

export function getLayoutMode() {
  return router.layoutMode;
}

export default router;
