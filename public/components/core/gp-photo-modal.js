/**
 * Photo Modal Component
 *
 * Modal for displaying photos with location and description.
 * Instagram-like display panel with 1px accent borders.
 */
class GpPhotoModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._isOpen = false;
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
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: var(--z-modal, 1000);
          padding: var(--space-md, 1rem);
        }

        .modal-content {
          display: flex;
          max-width: 1000px;
          max-height: 90vh;
          background: var(--color-bg, #fafafa);
          border: 1px solid var(--color-border, #0066ff);
        }

        /* Photo container */
        .photo-container {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-bg-secondary, #f0f0f0);
          min-width: 0;
        }

        .photo-container img {
          max-width: 100%;
          max-height: 90vh;
          object-fit: contain;
        }

        .photo-placeholder {
          width: 400px;
          height: 400px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .photo-placeholder svg {
          width: 30%;
          height: 30%;
          color: var(--color-text-muted, #666);
          opacity: 0.5;
        }

        /* Info panel */
        .info-panel {
          width: 280px;
          display: flex;
          flex-direction: column;
          border-left: 1px solid var(--color-border, #0066ff);
        }

        .info-header {
          padding: var(--space-md, 1rem);
          border-bottom: 1px solid var(--color-border, #0066ff);
        }

        .location {
          display: flex;
          align-items: center;
          gap: var(--space-xs, 0.25rem);
          font-family: var(--font-sans, system-ui);
                    font-weight: 600;
          color: var(--color-text, #1a1a1a);
        }

        .location svg {
          width: 16px;
          height: 16px;
          color: var(--color-primary, #0066ff);
        }

        .info-body {
          flex: 1;
          padding: var(--space-md, 1rem);
        }

        .description {
          font-family: var(--font-sans, system-ui);
                    line-height: 1.6;
          color: var(--color-text, #1a1a1a);
          margin: 0;
        }

        /* Close button */
        .close-btn {
          position: absolute;
          top: var(--space-md, 1rem);
          right: var(--space-md, 1rem);
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          cursor: pointer;
          transition: background var(--transition-fast, 0.15s ease);
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .close-btn svg {
          width: 24px;
          height: 24px;
        }

        /* Mobile: stack vertically */
        @media (max-width: 768px) {
          .modal-content {
            flex-direction: column;
            max-height: none;
            width: 100%;
          }

          .photo-container {
            max-height: 60vh;
          }

          .photo-placeholder {
            width: 100%;
            height: 300px;
          }

          .info-panel {
            width: 100%;
            border-left: none;
            border-top: 1px solid var(--color-border, #0066ff);
          }
        }
      </style>

      <div class="modal-overlay">
        <button class="close-btn" aria-label="Close modal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        <div class="modal-content">
          <div class="photo-container">
            <div class="photo-placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
            </div>
          </div>

          <div class="info-panel">
            <div class="info-header">
              <div class="location">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span class="location-text">Location</span>
              </div>
            </div>
            <div class="info-body">
              <p class="description">Photo description</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    const overlay = this.shadowRoot.querySelector(".modal-overlay");
    const closeBtn = this.shadowRoot.querySelector(".close-btn");

    closeBtn.addEventListener("click", () => this.close());

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        this.close();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this._isOpen) {
        this.close();
      }
    });
  }

  open(data) {
    this._isOpen = true;
    this.setAttribute("open", "");

    const photoContainer = this.shadowRoot.querySelector(".photo-container");
    const locationText = this.shadowRoot.querySelector(".location-text");
    const description = this.shadowRoot.querySelector(".description");

    // Update content
    if (data.imageSrc) {
      photoContainer.innerHTML = `<img src="${data.imageSrc}" alt="${data.description || "Photo"}">`;
    } else {
      photoContainer.innerHTML = `
        <div class="photo-placeholder">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <path d="M21 15l-5-5L5 21"/>
          </svg>
        </div>
      `;
    }

    locationText.textContent = data.location || "Unknown location";
    description.textContent = data.description || "";

    // Prevent body scroll
    document.body.style.overflow = "hidden";
  }

  close() {
    this._isOpen = false;
    this.removeAttribute("open");
    document.body.style.overflow = "";
  }
}

customElements.define("gp-photo-modal", GpPhotoModal);
