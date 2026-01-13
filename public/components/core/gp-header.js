/**
 * Site Header Component
 *
 * Displays site title and navigation links.
 * Includes theme toggle button.
 *
 * Imports: /styles/web-components.css for shared .logo, .nav-link styles
 */
class GpHeader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="/styles/web-components.css">
      <style>
        :host {
          display: block;
          width: 100%;
        }

        header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-md, 1rem);
          max-width: var(--max-width-wide, 1024px);
          margin: 0 auto;
        }

        nav {
          display: flex;
          align-items: center;
          gap: var(--space-md, 1rem);
        }

        @media (max-width: 600px) {
          header {
            flex-direction: column;
            gap: var(--space-md, 1rem);
          }

          nav {
            width: 100%;
            justify-content: center;
          }
        }
      </style>

      <header>
        <a href="/" class="logo">
          <svg class="logo-peak" viewBox="0 0 24 24" fill="none">
            <polygon points="12,2 22,22 2,22" />
          </svg>
          <span class="logo-text">Garrett Peake</span>
        </a>

        <nav>
          <a href="/" class="nav-link">Home</a>
          <a href="/blog" class="nav-link">Blog</a>
          <a href="/about" class="nav-link">About</a>
          <gp-theme-toggle></gp-theme-toggle>
        </nav>
      </header>
    `;

    this.highlightCurrentPage();
  }

  highlightCurrentPage() {
    const path = window.location.pathname;
    const links = this.shadowRoot.querySelectorAll('nav a');

    links.forEach((link) => {
      const href = link.getAttribute('href');
      if (href === path || (href !== '/' && path.startsWith(href))) {
        link.classList.add('active');
      }
    });
  }
}

customElements.define('gp-header', GpHeader);
