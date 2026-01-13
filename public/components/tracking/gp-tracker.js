/**
 * Tracker Component
 *
 * Silently tracks page views for recruiter analytics.
 * Reads tracking slug from localStorage and beacons to backend.
 */
class GpTracker extends HTMLElement {
  connectedCallback() {
    this.track();
  }

  track() {
    const slug = localStorage.getItem('trackingSlug');
    if (!slug) return;

    // Use sendBeacon for reliable tracking even on page unload
    const data = JSON.stringify({
      slug,
      page: window.location.pathname,
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
}

customElements.define('gp-tracker', GpTracker);
