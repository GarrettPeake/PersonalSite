/**
 * Theme Toggle Component
 *
 * Switches between light and dark themes.
 * Persists preference to localStorage.
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
      <style>
        :host {
          display: inline-flex;
        }

        button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          padding: 0;
          border: 2px solid var(--color-border, #0066ff);
          border-radius: 4px;
          background: transparent;
          cursor: pointer;
          transition: background-color 0.15s, transform 0.15s;
        }

        button:hover {
          background-color: color-mix(in srgb, var(--color-primary, #0066ff) 10%, transparent);
        }

        button:active {
          transform: scale(0.95);
        }

        svg {
          width: 20px;
          height: 20px;
          fill: var(--color-text, #1a1a1a);
        }

        .sun { display: none; }
        .moon { display: block; }

        :host([theme="dark"]) .sun { display: block; }
        :host([theme="dark"]) .moon { display: none; }
      </style>

      <button aria-label="Toggle theme" title="Toggle theme">
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
  }
}

customElements.define('gp-theme-toggle', GpThemeToggle);
