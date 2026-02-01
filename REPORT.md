

# QA Swarm Report — https://portfolio.gpeake.com

## Executive Summary

The portfolio site at portfolio.gpeake.com presents a clean, modern design with a functional homepage, working admin panel, and multi-page layout spanning blog, about, photography, and project showcase sections. The site demonstrates competent front-end engineering with SPA routing, theme toggling, and a custom CMS — however, testing revealed significant issues that undermine the production readiness of the deployment.

The most critical finding is a **broken `/projects` route** confirmed by all four agents — the primary navigation link returns a 404 on direct/server-side navigation, meaning any bookmarked, shared, or refreshed link to the projects page fails entirely. A separate critical concern is a potential **unauthenticated admin panel** reported by one agent, which if confirmed would expose the entire CMS to unauthorized modification. Additionally, content overflow bugs on the `/about` page and blog post views prevent users from accessing below-the-fold content on desktop viewports.

On the positive side, the homepage loads reliably across all viewports, the admin panel includes XSS protection on content inputs, the theme toggle works consistently, and the overall visual design is cohesive. The site's SPA client-side routing functions correctly — the issues are isolated to server-side fallback handling and responsive layout gaps, particularly on mobile where blog post pages use an entirely different navigation component than the rest of the site.

---

## Critical & Confirmed Issues

### 1. `/projects` route returns 404 on direct navigation
| | |
|---|---|
| **Severity** | Critical |
| **Confirmed by** | All 4 agents (desktop-1, desktop-2, mobile-1, mobile-2) |
| **URL** | `https://portfolio.gpeake.com/projects` |
| **Category** | Bug — SPA routing fallback |

**Description:** The `/projects` link appears in the main navigation on every page. Client-side SPA navigation works, but direct navigation (typing the URL, refreshing, bookmarking, or sharing the link) returns a 404 error page. The server does not have a fallback configured to serve the SPA shell for client-side routes.

**Steps to reproduce:**
1. Type `https://portfolio.gpeake.com/projects` directly in the browser address bar
2. Observe the 404 error page

**Impact:** Every visitor who bookmarks, shares, or refreshes the projects page sees a broken page. This is the first link in the navigation, making it highly visible. Search engines will also index it as a 404.

---

### 3. Blog post detail view clips left sidebar heading
| | |
|---|---|
| **Severity** | High |
| **Confirmed by** | 3 agents (desktop-2, mobile-1, mobile-2) |
| **URL** | `https://portfolio.gpeake.com/blog/*` |
| **Category** | Bug — Layout |

**Description:** Opening any blog post from the listing causes the post detail overlay to clip the "Garrett Peake." heading in the left sidebar. The period and trailing characters are cut off. On mobile, the issue is compounded by blog posts using a completely different navigation component (desktop-style horizontal nav instead of the hamburger menu used elsewhere).

**Steps to reproduce:**
1. Navigate to `/blog`
2. Click on any blog post title
3. Observe the clipped sidebar heading

**Impact:** Visual polish issue that appears on every blog post view, undermining the professional appearance of the portfolio.

---

### 5. No visible keyboard focus indicators
| | |
|---|---|
| **Severity** | Low |
| **Confirmed by** | 3 agents (desktop-2, mobile-1, mobile-2) |
| **URL** | `https://portfolio.gpeake.com/` |
| **Category** | Accessibility |

**Description:** Tab navigation shows no visible focus rings or outlines on interactive elements. Project cards on the homepage are not in the tab order at all. This violates WCAG 2.1 SC 2.4.7 (Focus Visible).

**Steps to reproduce:**
1. Navigate to the homepage
2. Press Tab repeatedly
3. Observe no visible focus indicator on any element

**Impact:** Keyboard-only and assistive technology users cannot effectively navigate the site.

---

### 8. Blog post date inconsistency
| | |
|---|---|
| **Severity** | Medium |
| **Confirmed by** | 2 agents (mobile-1, mobile-2) |
| **URL** | `https://portfolio.gpeake.com/blog/p2` |
| **Category** | Bug |

**Description:** "Post number 2" shows "January 13, 2026" on the blog listing but "January 14, 2026" on the detail page. The listing likely uses `publishedAt` while the detail uses `updatedAt`.

---

### 10. Excessive empty space on mobile About page
| | |
|---|---|
| **Severity** | Medium |
| **Confirmed by** | 2 agents (mobile-1, mobile-2) |
| **URL** | `https://portfolio.gpeake.com/about` |
| **Category** | UX — Layout |

**Description:** Large gaps of empty whitespace between content sections (bio, "What I Do", "Resume") create a broken appearance, particularly on mobile.

---

### 11. Blog/subpage header mountain SVG oversized on mobile
| | |
|---|---|
| **Severity** | Medium |
| **Confirmed by** | 2 agents (mobile-1, mobile-2) |
| **URL** | `https://portfolio.gpeake.com/blog` |
| **Category** | UX — Responsive |

**Description:** The decorative mountain SVG in the header takes up ~40% of header width on mobile, pushing the hamburger menu to the screen edge.

---

### 12. Inconsistent layout between SPA and direct navigation
| | |
|---|---|
| **Severity** | Medium |
| **Confirmed by** | 2 agents (desktop-1, desktop-2) |
| **URL** | `https://portfolio.gpeake.com/blog/*` |
| **Category** | UX |

**Description:** Direct navigation to blog post URLs renders a completely different layout (top navbar with logo and footer) compared to the left-sidebar layout used via client-side routing. This suggests two different rendering templates.

---

### 13. Admin Photos page shows rectangle artifact
| | |
|---|---|
| **Severity** | Medium |
| **Confirmed by** | 2 agents (desktop-1, mobile-1) |
| **URL** | `https://portfolio.gpeake.com/admin/photos` |
| **Category** | Bug |

**Description:** A large rectangle appears as a third item in the photo grid after the two legitimate photos. Likely a broken/empty photo card.

---

### 15. No sitemap.xml
| | |
|---|---|
| **Severity** | Low |
| **Confirmed by** | 2 agents (desktop-1, desktop-2) |
| **URL** | `https://portfolio.gpeake.com/sitemap.xml` |
| **Category** | SEO |

**Description:** `/sitemap.xml` returns 404. No XML sitemap is available for search engine crawlers. It should not include /admin.

---

### 16. Project click vs hover behavior mismatch
| | |
|---|---|
| **Severity** | Info |
| **Confirmed by** | 3 agents (desktop-2, mobile-1, mobile-2) |
| **URL** | `https://portfolio.gpeake.com/` |
| **Category** | UX |

**Description:** Clicking a project card clears the "Select a project" text but shows no description. The description only appears on hover, making click feel broken. On mobile (no hover), the cards appear completely non-interactive.

---

### 17. robots.txt lacks functional directives
| | |
|---|---|
| **Severity** | Info |
| **Confirmed by** | 2 agents (mobile-1, mobile-2) |
| **URL** | `https://portfolio.gpeake.com/robots.txt` |
| **Category** | SEO |

**Description:** The robots.txt file contains only AI content-signal comments with no User-agent, Disallow, or Allow directives. The `/admin` routes are not blocked from indexing.

---

## Desktop-Specific Issues

### Blog post overlay does not scroll — content cut off (desktop-1)
**Severity:** High | **URL:** `/blog/test-post1`

When viewing a blog post from the listing, the post content area has `overflow: hidden` or no scroll enabled. Posts with content taller than the viewport (scrollHeight 1736px vs clientHeight 900px) cannot be scrolled. Users cannot read content below the fold.

### Right sidebar permanently shows "Loading projects..." on non-homepage pages (desktop-2)
**Severity:** Medium | **URL:** `/blog`, `/about`, `/photography`

The right sidebar complementary section shows "Loading projects..." and "Hover over a project to see details" that never resolves on any page other than the homepage.

### /about page content overflow hides Resume section (desktop-2)
**Severity:** Critical | **URL:** `/about`

The about page content extends to 1736px but the body is constrained to 900px with `overflow: hidden`. The Resume section's "View LinkedIn Profile" button is cut off and inaccessible. **Note:** This was found by only one agent but has critical impact — an entire page section is inaccessible.

---

## Mobile-Specific Issues

### Blog post pages use desktop navigation on mobile (mobile-1, mobile-2)
**Severity:** High | **URL:** `/blog/*` (individual posts)

Individual blog post pages render a desktop-style horizontal navigation bar (Projects, Blog, About, Toggle theme) instead of the mobile hamburger menu. The blog post template uses a completely different layout component than the rest of the site.

### Blog post overlay does not match dark/light theming
**Severity:** High | **URL:** `/blog/*` (individual posts)

Regardless of color mode, the blog post background is black and text is white.

### Escape key does not close mobile menu (mobile-1)
**Severity:** Medium | **URL:** All subpages

When the mobile hamburger menu is open, pressing Escape does not close it. The menu can only be closed by clicking the menu button. Violates WCAG keyboard accessibility guidelines.

### Admin panel accessible without authentication (mobile-2)
**Severity:** Critical (unconfirmed) | **URL:** `/admin/`

One agent reported that after clearing cookies, the admin dashboard renders fully with all data visible. If confirmed, this is the highest-priority security issue — the entire CMS is exposed to unauthorized access. **Requires immediate manual verification.**

---

## Additional Findings by Severity

### High
- **Missing favicon.ico** (mobile-2, corroborated by 3 other agents as related findings) — 404 on every page load generates console errors and no browser tab icon is displayed.

### Informational
- **Homepage shows "Loading projects..." flash** (mobile-2) — brief loading state visible before project data renders.
- **Hidden "//" text in accessibility tree** (mobile-1) — appears on subpages but not visually rendered; may confuse screen readers.

