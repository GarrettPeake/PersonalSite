/**
 * Theme Toggle Component
 *
 * Switches between light and dark themes.
 * Persists preference to localStorage.
 *
 * Imports: /styles/web-components.css for shared .icon-btn styles
 */
class GpThemeToggle extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.initTheme();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="/styles/web-components.css">
      <style>
        :host {
          display: inline-flex;
        }

        /* Theme-specific icon visibility */
        .sun { display: none; }
        .moon { display: block; }

        :host([theme="dark"]) .sun { display: block; }
        :host([theme="dark"]) .moon { display: none; }
      </style>

      <button type="button" class="icon-btn" aria-label="Toggle theme" title="Toggle theme">
        <svg class="sun" viewBox="0 0 24 24">
          <path d="M12 7a5 5 0 100 10 5 5 0 000-10zM12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
        <svg class="moon" viewBox="0 0 24 24">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
        </svg>
      </button>
    `;

    this.shadowRoot.querySelector('button').addEventListener('click', () => this.toggle());
  }

  initTheme() {
    // Check localStorage first, then system preference
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored || (prefersDark ? 'dark' : 'light');

    this.setTheme(theme);
  }

  toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  }

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.setAttribute('theme', theme);
    localStorage.setItem('theme', theme);

    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    const btn = this.shadowRoot.querySelector('button');
    if (btn) {
      btn.setAttribute('aria-label', `Toggle theme: switch to ${nextTheme} mode`);
    }
  }
}

customElements.define('gp-theme-toggle', GpThemeToggle);
