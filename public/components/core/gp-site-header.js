/**
 * Site Header Component
 *
 * Redesigned header with mountain peaks theme toggle.
 * Used on blog, about, and photography pages.
 * Features:
 * - Compact logo on left
 * - Nav links with forward slash styling
 * - Mountain peaks with sun/moon theme toggle
 * - Responsive hamburger menu on mobile
 */
class GpSiteHeader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._mobileMenuOpen = false;
  }

  connectedCallback() {
    this.render();
    this.initTheme();
    this.setupEventListeners();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          border-bottom: var(--border-thin, 1px) solid var(--color-border, #0066ff);
        }

        header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: var(--max-width-full, 1400px);
          margin: 0 auto;
          height: 60px;
        }

        /* Logo */
        .logo {
          display: flex;
          align-items: baseline;
          text-decoration: none;
          color: var(--color-text, #1a1a1a);
          font-family: var(--font-display, 'Space Grotesk', sans-serif);
          font-weight: 700;
          font-size: 1.25rem;
          letter-spacing: -0.02em;
        }

        .logo:hover {
          text-decoration: none;
          color: var(--color-primary, #0066ff);
        }

        .logo:hover .page-suffix {
          color: var(--color-primary, #0066ff);
        }

        .page-suffix {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--color-accent, #ff6b00);
          margin-left: 2px;
        }

        /* Navigation */
        nav {
          display: flex;
          align-items: center;
          gap: var(--space-lg, 2rem);
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: var(--space-md, 1rem);
        }

        .nav-link {
          color: var(--color-text, #1a1a1a);
          text-decoration: none;
          font-family: var(--font-sans, system-ui);
          font-size: 0.9rem;
          font-weight: 500;
          transition: color var(--transition-fast, 0.15s ease);
        }

        .nav-link::before {
          content: '/';
          color: var(--color-text-muted, #666);
          margin-right: 2px;
        }

        .nav-link:hover {
          color: var(--color-primary, #0066ff);
        }

        /* Mountain Theme Toggle */
        .theme-toggle-container {
          position: relative;
          width: 80px;
          height: 60px;
          cursor: pointer;
          overflow: hidden;
          border: 1px solid var(--color-primary)
        }

        .mountains-bg {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 100%;
          overflow: hidden;
        }

        .mountain {
          position: absolute;
          bottom: 0;
          fill: var(--color-border, #0066ff);
        }

        .mountain-left {
          left: 0;
          width: 40px;
          height: 26px;
        }

        .mountain-center {
          left: 50%;
          transform: translateX(-50%);
          width: 50px;
          height: 40px;
          z-index: 2;
        }

        .mountain-right {
          right: 0;
          width: 45px;
          height: 32px;
        }

        /* Sun/Moon */
        .celestial {
          position: absolute;
          top: 2px;
          left: 50%;
          transform: translateX(-50%);
          width: 20px;
          height: 20px;
          border-radius: 50%;
          transition: transform var(--transition-medium, 0.3s ease),
                      opacity var(--transition-medium, 0.3s ease),
                      background var(--transition-medium, 0.3s ease);
          z-index: 1;
        }

        .sun {
          background: #ff6b00;
          box-shadow: 0 0 10px rgba(255, 107, 0, 0.5);
        }

        .moon {
          background: #0066ff;
          box-shadow: 0 0 10px rgba(0, 102, 255, 0.3);
        }

        /* Theme states */
        :host([theme="light"]) .sun {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }

        :host([theme="light"]) .moon {
          transform: translateX(-50%) translateY(40px);
          opacity: 0;
        }

        :host([theme="dark"]) .sun {
          transform: translateX(-50%) translateY(40px);
          opacity: 0;
        }

        :host([theme="dark"]) .moon {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }

        /* Hamburger menu button */
        .hamburger {
          display: none;
          flex-direction: column;
          justify-content: center;
          gap: 4px;
          width: 32px;
          height: 32px;
          padding: 6px;
          background: transparent;
          border: var(--border-thin, 1px) solid var(--color-border, #0066ff);
          cursor: pointer;
        }

        .hamburger span {
          display: block;
          width: 100%;
          height: 2px;
          background: var(--color-text, #1a1a1a);
          transition: transform var(--transition-fast, 0.15s ease);
        }

        .hamburger.open span:nth-child(1) {
          transform: rotate(45deg) translate(4px, 4px);
        }

        .hamburger.open span:nth-child(2) {
          opacity: 0;
        }

        .hamburger.open span:nth-child(3) {
          transform: rotate(-45deg) translate(4px, -4px);
        }

        /* Mobile menu */
        .mobile-menu {
          display: none;
          position: absolute;
          top: 60px;
          left: 0;
          right: 0;
          background: var(--color-bg, #fafafa);
          border-bottom: var(--border-thin, 1px) solid var(--color-border, #0066ff);
          padding: var(--space-md, 1rem);
          z-index: var(--z-dropdown, 100);
        }

        .mobile-menu.open {
          display: flex;
          flex-direction: column;
          gap: var(--space-md, 1rem);
        }

        .mobile-menu .nav-link {
          font-size: 1.1rem;
          padding: var(--space-sm, 0.5rem) 0;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .nav-links {
            display: none;
          }

          .hamburger {
            display: flex;
          }
        }
      </style>

      <header>
        <a href="/" class="logo">Garrett Peake${this.getPageSuffix()}</a>

        <nav>
          <div class="nav-links">
            ${this.getNavLinks()}
          </div>

          <div class="theme-toggle-container" role="button" aria-label="Toggle theme" tabindex="0">
            <div class="celestial sun"></div>
            <div class="celestial moon"></div>
            <div class="mountains-bg">
              <svg class="mountain mountain-left" viewBox="0 0 40 26" preserveAspectRatio="none">
                <polygon points="0,26 20,0 40,26"/>
              </svg>
              <svg class="mountain mountain-center" viewBox="0 0 50 40" preserveAspectRatio="none">
                <polygon points="0,40 25,0 50,40"/>
              </svg>
              <svg class="mountain mountain-right" viewBox="0 0 45 32" preserveAspectRatio="none">
                <polygon points="0,32 22.5,0 45,32"/>
              </svg>
            </div>
          </div>

          <button class="hamburger" aria-label="Menu" aria-expanded="false">
            <span></span>
            <span></span>
            <span></span>
          </button>
        </nav>
      </header>

      <div class="mobile-menu">
        ${this.getNavLinks()}
      </div>
    `;
  }

  getPageSuffix() {
    const page = this.getAttribute('page');
    if (!page) return '';
    return `<span class="page-suffix">/${page}</span>`;
  }

  getNavLinks() {
    const currentPage = this.getAttribute('page');
    const allLinks = [
      { href: '/blog', label: 'blog' },
      { href: '/about', label: 'about' },
      { href: '/photography', label: 'photography' }
    ];

    return allLinks
      .filter(link => link.label !== currentPage)
      .map(link => `<a href="${link.href}" class="nav-link">${link.label}</a>`)
      .join('\n            ');
  }

  setupEventListeners() {
    const themeToggle = this.shadowRoot.querySelector(
      ".theme-toggle-container"
    );
    themeToggle.addEventListener("click", () => this.toggleTheme());
    themeToggle.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.toggleTheme();
      }
    });

    const hamburger = this.shadowRoot.querySelector(".hamburger");
    hamburger.addEventListener("click", () => this.toggleMobileMenu());
  }

  toggleMobileMenu() {
    this._mobileMenuOpen = !this._mobileMenuOpen;
    const hamburger = this.shadowRoot.querySelector(".hamburger");
    const mobileMenu = this.shadowRoot.querySelector(".mobile-menu");

    hamburger.classList.toggle("open", this._mobileMenuOpen);
    hamburger.setAttribute("aria-expanded", this._mobileMenuOpen);
    mobileMenu.classList.toggle("open", this._mobileMenuOpen);
  }

  initTheme() {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const theme = stored || (prefersDark ? "dark" : "light");
    this.setTheme(theme);
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    this.setTheme(next);
  }

  setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    this.setAttribute("theme", theme);
    localStorage.setItem("theme", theme);
  }
}

customElements.define("gp-site-header", GpSiteHeader);
