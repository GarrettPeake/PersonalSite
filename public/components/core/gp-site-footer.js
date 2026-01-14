/**
 * Site Footer Component
 *
 * Minimal footer with just copyright text.
 * Used on blog, about, and photography pages.
 */
class GpSiteFooter extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  render() {
    const year = new Date().getFullYear();

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          margin-top: auto;
        }

        footer {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: var(--space-md, 1rem);
          border-top: var(--border-thin, 1px) solid var(--color-border, #0066ff);
        }

        .copyright {
          font-size: 0.8rem;
          color: var(--color-text-muted, #666);
          font-family: var(--font-sans, system-ui);
        }
      </style>

      <footer>
        <p class="copyright">&copy; ${year} Garrett Peake</p>
      </footer>
    `;
  }
}

customElements.define('gp-site-footer', GpSiteFooter);
