/**
 * Tracker Component
 *
 * Silently tracks page views for recruiter analytics.
 * Reads tracking slug from localStorage and beacons to backend.
 * Exposes trackPageView() method for SPA navigation tracking.
 */
class GpTracker extends HTMLElement {
  connectedCallback() {
    this.track();
  }

  track(path = window.location.pathname) {
    const slug = localStorage.getItem('trackingSlug');
    if (!slug) return;

    // Use sendBeacon for reliable tracking even on page unload
    const data = JSON.stringify({
      slug,
      page: path,
      timestamp: new Date().toISOString(),
    });

    // Try sendBeacon first, fall back to fetch
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', data);
    } else {
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data,
        keepalive: true,
      }).catch(() => {
        // Silently fail - tracking should not impact user experience
      });
    }
  }

  // Called by SPA router on navigation
  trackPageView(path) {
    this.track(path);
  }
}

customElements.define('gp-tracker', GpTracker);
