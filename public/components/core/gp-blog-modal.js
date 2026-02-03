/**
 * Blog Modal Component
 *
 * Full-screen modal for displaying blog posts in SPA mode.
 * Follows gp-photo-modal pattern.
 */

class GpBlogModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._isOpen = false;
    this._currentSlug = null;
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: none;
        }

        :host([open]) {
          display: block;
          position: fixed;
          inset: 0;
          z-index: var(--z-modal, 1000);
          pointer-events: none;
        }

        .modal-overlay {
          position: absolute;
          top: 0;
          bottom: 0;
          /* Position between hero section and right panel.
             280px = hero-section width, var(--space-xl) = content-inner padding */
          left: calc(280px + var(--space-xl, 4rem));
          right: var(--panel-right-width, 320px);
          background: var(--color-bg, #fafafa);
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          border-left: 1px solid var(--color-border, #e0e0e0);
          border-right: 1px solid var(--color-border, #e0e0e0);
          outline: none;
          pointer-events: auto;
        }

        @media (min-width: 901px) and (max-width: 1200px) {
          .modal-overlay {
            left: calc(240px + var(--space-xl, 4rem));
          }
        }

        .modal-header {
          position: sticky;
          top: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-md, 1rem) var(--space-lg, 2rem);
          background: var(--color-bg, #fafafa);
          border-bottom: 1px solid var(--color-border, #e0e0e0);
          z-index: 10;
        }

        .back-btn {
          display: flex;
          align-items: center;
          gap: var(--space-xs, 0.25rem);
          padding: var(--space-sm, 0.5rem) var(--space-md, 1rem);
          background: transparent;
          border: 1px solid var(--color-border, #e0e0e0);
          color: var(--color-text, #1a1a1a);
          font-family: var(--font-mono, monospace);
          font-size: 0.9rem;
          cursor: pointer;
          transition: background var(--transition-fast, 0.15s ease), color var(--transition-fast, 0.15s ease);
        }

        .back-btn:hover {
          background: var(--color-primary, #0066ff);
          border-color: var(--color-primary, #0066ff);
          color: var(--color-bg, #fafafa);
        }

        .back-btn svg {
          width: 16px;
          height: 16px;
        }

        .modal-content {
          max-width: 800px;
          margin: 0 auto;
          padding: var(--space-xl, 4rem) var(--space-lg, 2rem);
        }

        .post-title {
          font-family: var(--font-display, system-ui);
          font-size: 2.5rem;
          font-weight: 700;
          line-height: 1.2;
          margin-bottom: var(--space-sm, 0.5rem);
          letter-spacing: -0.02em;
          color: var(--color-text, #1a1a1a);
        }

        .post-meta {
          font-family: var(--font-mono, monospace);
          font-size: 0.85rem;
          color: var(--color-text-muted, #666);
          margin-bottom: var(--space-xl, 4rem);
        }

        /* Post body: layout overrides only (markdown styles from linked stylesheet) */
        .post-body {
          font-size: 1.1rem;
          color: var(--color-text, #1a1a1a);
        }

        .post-body h1,
        .post-body h2,
        .post-body h3 {
          font-family: var(--font-display, system-ui);
        }

        .post-body h1 { font-size: 2rem; }
        .post-body h2 { font-size: 1.5rem; }
        .post-body h3 { font-size: 1.25rem; }

        .loading {
          text-align: center;
          color: var(--color-text-muted, #666);
          padding: var(--space-xl, 4rem);
        }

        .error {
          text-align: center;
          color: var(--color-text-muted, #666);
          padding: var(--space-xl, 4rem);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .modal-header {
            padding: var(--space-sm, 0.5rem) var(--space-md, 1rem);
          }

          .modal-content {
            padding: var(--space-lg, 2rem) var(--space-md, 1rem);
          }

          .post-title {
            font-size: 1.75rem;
          }

          .post-body {
            font-size: 1rem;
          }
        }
      </style>

      <link rel="stylesheet" href="/styles/markdown-content.css">
      <div class="modal-overlay" tabindex="-1">
        <header class="modal-header">
          <button class="back-btn" aria-label="Back to blog">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to blog
          </button>
        </header>

        <article class="modal-content">
          <p class="loading">Loading post...</p>
        </article>
      </div>
    `;
  }

  setupEventListeners() {
    const backBtn = this.shadowRoot.querySelector('.back-btn');
    backBtn.addEventListener('click', () => this.close());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._isOpen) {
        this.close();
      }
    });
  }

  async open(slug) {
    this._isOpen = true;
    this._currentSlug = slug;
    this.setAttribute('open', '');

    const content = this.shadowRoot.querySelector('.modal-content');
    content.innerHTML = '<p class="loading">Loading post...</p>';

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    try {
      const response = await fetch(`/api/posts/${slug}`);
      if (!response.ok) throw new Error('Post not found');

      const post = await response.json();
      this.renderPost(post);
      this.focusOverlay();
    } catch (err) {
      content.innerHTML = '<p class="error">Post not found</p>';
      this.focusOverlay();
    }
  }

  renderPost(post) {
    const content = this.shadowRoot.querySelector('.modal-content');

    document.title = `${post.title} | Garrett Peake`;

    content.innerHTML = `
      <h2 class="post-title">${this.escapeHtml(post.title)}</h2>
      <p class="post-meta">${this.formatDate(post.publishedAt)}</p>
      <div class="post-body md-content">${typeof window.renderMarkdown === 'function' ? window.renderMarkdown(post.content) : this.escapeHtml(post.content)}</div>
    `;
  }

  focusOverlay() {
    const overlay = this.shadowRoot.querySelector('.modal-overlay');
    if (overlay) overlay.focus();
  }

  close() {
    if (!this._isOpen) return;

    this._isOpen = false;
    this._currentSlug = null;
    this.removeAttribute('open');
    document.body.style.overflow = '';
    document.title = 'Blog | Garrett Peake';

    // Dispatch event for router to handle URL update
    this.dispatchEvent(new CustomEvent('blog-modal-close', { bubbles: true }));
  }

  formatDate(isoString) {
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC'
    });
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('gp-blog-modal', GpBlogModal);
