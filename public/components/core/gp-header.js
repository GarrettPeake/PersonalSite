/**
 * Site Header Component
 *
 * Displays site title and navigation links.
 * Includes theme toggle button.
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

        .logo {
          display: flex;
          align-items: center;
          gap: var(--space-sm, 0.5rem);
          text-decoration: none;
          color: var(--color-text, #1a1a1a);
        }

        .logo:hover {
          text-decoration: none;
        }

        .logo-text {
          font-weight: 700;
          font-size: 1.25rem;
          letter-spacing: -0.02em;
        }

        .logo-peak {
          width: 24px;
          height: 24px;
        }

        .logo-peak polygon {
          fill: var(--color-primary, #0066ff);
        }

        nav {
          display: flex;
          align-items: center;
          gap: var(--space-md, 1rem);
        }

        nav a {
          color: var(--color-text, #1a1a1a);
          text-decoration: none;
          font-weight: 500;
          padding: var(--space-xs, 0.25rem) var(--space-sm, 0.5rem);
          border-radius: 4px;
          transition: background-color 0.15s;
        }

        nav a:hover {
          background-color: color-mix(in srgb, var(--color-primary, #0066ff) 10%, transparent);
        }

        nav a.active {
          color: var(--color-primary, #0066ff);
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
          <a href="/">Home</a>
          <a href="/blog">Blog</a>
          <a href="/about">About</a>
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
