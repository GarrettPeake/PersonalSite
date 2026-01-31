# Website Audit Report

**Date:** January 31, 2026
**Viewport sizes tested:** Desktop (1280x800), Tablet (768x1024), Mobile (375x812)
**Screenshots:** See `screenshots/` directory (29 screenshots captured)

---

## Critical Bugs

### 1. Blog post content shows "undefined" on desktop

- **Severity:** Critical
- **Pages affected:** All blog post detail views on desktop (/blog/n, /blog/p2, /blog/test-post1)
- **Description:** Every blog post displays the literal string "undefined" as its body content on the desktop layout. The mobile layout renders content correctly (e.g., "asdsdsadsa" for the first post), proving the data exists in the API. The desktop template is likely referencing a wrong property name for the post body.
- **Screenshots:** `09-blog-post-new-post-jared.png`, `10-blog-post-number-2.png`, `11-blog-post-test-post.png`

### 2. Resume section not reachable on desktop About page

- **Severity:** High
- **Pages affected:** /about (desktop only)
- **Description:** The "Resume" section with the "View LinkedIn Profile" CTA exists in the DOM but is not visible on screen. The scroll is applied to the content area rather than the full page, making it non-obvious that there is more content below the fold. The page itself should scroll so users can naturally reach the Resume section. On mobile, the page scrolls correctly and the Resume section is accessible.
- **Screenshots:** `13-about-page-after-dismiss.png`, `14-about-page-fullpage.png` (desktop, section not reachable), `26-mobile-about.png` (mobile, section visible)

### 3. Dynamic routing causes issues during resize events

- **Severity:** Medium
- **Pages affected:** All pages
- **Description:** If the page is resized to fit mobile, the mobile view will always default to showing the projects page. The page is resized to fit desktop, it maintains the mobile styling until refreshed. The resizing needs to be responsive such that the content persists, just display styling changes

---

## Functional Bugs

### 4. Blog post overlay persists across route changes

- **Severity:** Medium
- **Description:** When viewing a blog post detail view and then clicking a nav link (e.g., /about), the blog post overlay remains on top of the new page. Users must manually dismiss it via "Back to blog" before the new route's content becomes visible.
- **Screenshots:** `12-about-page.png` (blog overlay covering about page)

### 5. No 404 page

- **Severity:** Medium
- **Description:** Navigating to a non-existent URL (e.g., /nonexistent-page) silently falls back to the homepage instead of showing a 404 error page. The URL bar retains the bad URL, causing confusion.
- **Screenshots:** `29-404-page.png`

### 6. /projects nav link points to root (/)

- **Severity:** Low
- **Description:** The "/projects" navigation link has `href="/"` rather than `href="/projects"`. While functionally the same (the homepage IS the projects page), it's semantically incorrect and could confuse users or affect SEO.

### 7. Inconsistent LinkedIn profile URLs

- **Severity:** Low
- **Description:** Desktop uses `linkedin.com/in/gepeake` while the mobile blog post footer uses `linkedin.com/in/garrettpeake`. `gepeake` is the correct slug.

### 8. Hardcoded placeholder projects in mobile SSR

- **Severity:** Low
- **Description:** The mobile/tablet initial HTML contains placeholder projects ("Personal Site", "Project Alpha", "Project Beta") that get replaced by real data ("Kana Reader", "Portfolio Site") after JavaScript loads. This creates a brief flash of incorrect content (FOUC). The placeholders should be removed completely.

---

## Design & UX Issues

### 9. Theme toggle is not discoverable

- **Description:** The dark mode toggle is hidden behind the mountain logo graphic. There's no tooltip, label, or visual indicator that it's interactive. On desktop, it looks purely decorative. The mobile menu does label it "Theme" which is better.
- **Recommendation:** Add a sun/moon icon or tooltip. On desktop, consider placing a labeled toggle in the sidebar.

### 10. Dashed border lines throughout the site

- **Description:** Orange (light mode) and blue (dark mode) dashed borders appear around content sections on all pages. These look like CSS debug/layout guides that were left in production. While they may be intentional neo-brutalist design, they can look unpolished to many visitors.
- **Recommendation:** If intentional, make them more deliberate. If not, remove them.

### 11. Desktop page titles not page-specific

- **Description:** The `<title>` tag is always "Garrett Peake" on desktop regardless of which page the user is on. Mobile correctly sets titles like "Blog | Garrett Peake" and "About | Garrett Peake". This hurts SEO and browser tab usability.

### 12. Narrow text column next to About page photo

- **Description:** The bio text on the About page wraps into a very narrow column beside the photo, sometimes showing just one or two words per line (especially on mobile). This makes for an awkward reading experience.
- **Recommendation:** Stack the photo above the text on narrower viewports, or constrain the photo width.

### 13. Photography gallery uses too large of icons on mobile

- **Description:** The grid should be 3 photos wide on mobile

### 15. Dark mode sidebar color is jarring

- **Description:** The right sidebar on the homepage changes from blue (light mode) to a very saturated orange (dark mode). The orange is visually overwhelming and distracting compared to the rest of the dark theme's muted palette. To fix this, the sidebar and mountains should not have a background at all and only use a thin border of the primary color to outline the shape of the mountains and sidebar. The sidebar can then use the same background color as the rest of the page.
- **Screenshots:** `19-homepage-dark-mode.png`

---

## Inconsistencies Between Desktop & Mobile

| Feature                  | Desktop                                                         | Mobile                                        |
| ------------------------ | --------------------------------------------------------------- | --------------------------------------------- |
| Blog post content        | Shows "undefined", incorrect                                    | Renders correctly                             |
| Page titles              | Always "Garrett Peake", incorrect                               | Page-specific (e.g., "Blog \| Garrett Peake") |
| Footer                   | Should dislay correct copyright at the foot in the hero section | "© 2026 Garrett Peake"                        |
| Resume section on /about | Hidden (no scroll)                                              | Visible (scrollable)                          |
| LinkedIn URL             | linkedin.com/in/gepeake                                         | linkedin.com/in/garrettpeake, incorrect       |

---

## Summary of All Screenshots

| #   | Filename                           | Description                                    |
| --- | ---------------------------------- | ---------------------------------------------- |
| 1   | `01-homepage-initial.png`          | Desktop homepage on first load                 |
| 2   | `02-homepage-fullpage.png`         | Desktop homepage full page                     |
| 3   | `03-hover-portfolio-site.png`      | Hovering Portfolio Site project in sidebar     |
| 4   | `04-click-portfolio-site.png`      | Portfolio Site project selected                |
| 5   | `05-portfolio-site-after-wait.png` | Portfolio Site project after wait              |
| 6   | `06-click-kana-reader.png`         | KanaReader preview restored                    |
| 7   | `07-sidebar-scrolled.png`          | Sidebar scrolled to bottom                     |
| 8   | `08-blog-page.png`                 | Blog listing page (desktop)                    |
| 9   | `09-blog-post-new-post-jared.png`  | Blog post "New post jared" - shows "undefined" |
| 10  | `10-blog-post-number-2.png`        | Blog post "Post number 2" - shows "undefined"  |
| 11  | `11-blog-post-test-post.png`       | Blog post "Test post" - shows "undefined"      |
| 12  | `12-about-page.png`                | About page with blog overlay still visible     |
| 13  | `13-about-page-after-dismiss.png`  | About page after dismissing overlay            |
| 14  | `14-about-page-fullpage.png`       | About page full page (Resume hidden)           |
| 15  | `15-about-page-scrolled.png`       | About page scroll attempt (no scroll)          |
| 16  | `16-photography-page.png`          | Photography gallery (2 photos)                 |
| 17  | `17-photo-clicked.png`             | Photo lightbox/modal open                      |
| 18  | `18-theme-toggled.png`             | Photography page in dark mode                  |
| 19  | `19-homepage-dark-mode.png`        | Homepage in dark mode                          |
| 20  | `20-blog-dark-mode.png`            | Blog page in dark mode                         |
| 21  | `21-about-dark-mode.png`           | About page in dark mode                        |
| 22  | `22-mobile-homepage.png`           | Mobile homepage (375px)                        |
| 23  | `23-mobile-menu-open.png`          | Mobile hamburger menu open                     |
| 24  | `24-mobile-blog.png`               | Mobile blog listing                            |
| 25  | `25-mobile-blog-post.png`          | Mobile blog post (content renders!)            |
| 26  | `26-mobile-about.png`              | Mobile about page (full page, Resume visible)  |
| 27  | `27-mobile-photography.png`        | Mobile photography page                        |
| 28  | `28-tablet-homepage.png`           | Tablet homepage (768px)                        |
| 29  | `29-404-page.png`                  | Non-existent URL (no 404 page)                 |
