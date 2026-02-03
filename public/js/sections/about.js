/**
 * About Section Module
 *
 * Loads about page content from the CMS API.
 * Falls back to hardcoded HTML if no CMS content exists.
 */

const fallbackHtml = `
      <div class="about-hero">
        <div class="profile-frame">
          <div class="profile-image">
            <img src="/assets/about_photo.jpg" alt="Garrett Peake" />
          </div>
          <div class="frame-corner frame-corner--tl"></div>
          <div class="frame-corner frame-corner--tr"></div>
          <div class="frame-corner frame-corner--bl"></div>
          <div class="frame-corner frame-corner--br"></div>
        </div>

        <div class="about-intro">
          <p class="intro-text">
            Hi, I'm Garrett. I'm a software engineer who enjoys building
            things that make a difference. I'm passionate about clean code,
            thoughtful design, and creating great user experiences.
          </p>
        </div>
      </div>

      <section class="about-section-block">
        <h2>What I Do</h2>
        <p>
          I specialize in full-stack development, working across the entire
          stack from infrastructure to pixel-perfect frontends. I have
          experience with modern web technologies, cloud platforms, and
          building scalable systems.
        </p>
      </section>

      <section class="about-section-block resume-section">
        <h2>Resume</h2>
        <p>
          For detailed information about my professional experience, skills,
          and education, please visit my LinkedIn profile.
        </p>
        <a
          href="https://www.linkedin.com/in/gepeake"
          target="_blank"
          rel="noopener"
          class="linkedin-link"
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path
              fill="currentColor"
              d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
            />
          </svg>
          View LinkedIn Profile
        </a>
      </section>
`;

const template = `
  <div class="about-section-spa">
    <div class="about-content">
      <p class="loading">Loading...</p>
    </div>
  </div>
`;

async function init(container) {
  const contentEl = container.querySelector('.about-content');

  try {
    const res = await fetch('/api/about');
    if (res.ok) {
      const data = await res.json();
      if (data.content && data.content.trim()) {
        contentEl.innerHTML = '<div class="md-content">' + window.renderMarkdown(data.content) + '</div>';
        return;
      }
    }
  } catch (err) {
    // Fall through to fallback
  }

  // Fallback to hardcoded content
  contentEl.innerHTML = fallbackHtml;
}

export default {
  template,
  init
};
