/**
 * Peak Divider Component
 *
 * Mountain peak silhouette used as a section separator.
 * Neo-brutalist design element tied to "Peake" name.
 */
class GpPeakDivider extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  render() {
    // Get optional attributes
    const height = this.getAttribute('height') || '40px';
    const inverted = this.hasAttribute('inverted');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: ${height};
          margin: var(--space-lg, 2rem) 0;
        }

        svg {
          width: 100%;
          height: 100%;
        }

        .peaks {
          fill: var(--color-primary, #0066ff);
        }

        :host([inverted]) .peaks {
          fill: var(--color-accent, #ff6b00);
        }
      </style>

      <svg viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
        <polygon class="peaks" points="${inverted ? this.getInvertedPoints() : this.getPoints()}" />
      </svg>
    `;
  }

  getPoints() {
    // Mountain peaks pointing up
    return '0,40 20,15 35,28 50,8 70,25 85,5 100,20 115,10 135,30 150,12 170,22 185,6 200,18 200,40';
  }

  getInvertedPoints() {
    // Mountain peaks pointing down (for bottom of sections)
    return '0,0 20,25 35,12 50,32 70,15 85,35 100,20 115,30 135,10 150,28 170,18 185,34 200,22 200,0';
  }
}

customElements.define('gp-peak-divider', GpPeakDivider);
