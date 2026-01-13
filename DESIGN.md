# Garrett Peake Personal Website - Design Document

## Overview

A personal website built on Cloudflare Workers with a neo-brutalist aesthetic, featuring a portfolio, blog, and admin CRM with a macro-enriched markdown editor.

**Domain:** `gpeake.com`

**Tech Stack:**
- Frontend: Vanilla HTML, CSS, JS with Web Components (no build step)
- Backend: Cloudflare Workers (TypeScript)
- Storage: Cloudflare KV (single-table design)
- Files: Cloudflare R2 (images, uploads)
- Analytics: Workers Analytics Engine
- Static Serving: Workers Static Assets (most requests bypass Worker)

---

## Cloudflare Infrastructure Setup

### Required Resources (Create in Dashboard)

Before development, create these resources in the Cloudflare dashboard:

1. **KV Namespace**
   - Name: `gpeake-data`
   - Note the namespace ID after creation

2. **R2 Bucket**
   - Name: `gpeake-uploads`
   - Enable public access via custom domain: `files.gpeake.com`

3. **Analytics Engine Dataset**
   - Name: `page_views`
   - Created automatically when first used, but binding must be configured

4. **Environment Variables / Secrets**
   - `ADMIN_USERNAME` - Admin login username
   - `ADMIN_PASSWORD_HASH` - Bcrypt hash of admin password
   - `SESSION_SECRET` - Random string for signing session tokens

### wrangler.toml Configuration

```toml
name = "gpeake-site"
main = "src/index.ts"
compatibility_date = "2025-01-01"

# Static assets configuration
[assets]
directory = "./public"
binding = "ASSETS"
not_found_handling = "single-page-application"
# Only invoke Worker for API routes, tracking, and dynamic pages
run_worker_first = [
  "/api/*",
  "/s/*",
  "/blog/*",
  "/draft/*",
  "/admin/*"
]

# KV Namespace binding
[[kv_namespaces]]
binding = "KV"
id = "<YOUR_KV_NAMESPACE_ID>"
preview_id = "<YOUR_KV_NAMESPACE_ID>"

# R2 Bucket binding
[[r2_buckets]]
binding = "R2"
bucket_name = "gpeake-uploads"

# Analytics Engine binding
[[analytics_engine_datasets]]
binding = "ANALYTICS"
dataset = "page_views"

# Environment variables (non-secret)
[vars]
SITE_URL = "https://gpeake.com"

# Routes
[[routes]]
pattern = "gpeake.com/*"
custom_domain = true
```

### Secrets (set via wrangler CLI)

```bash
# Set these after project setup
wrangler secret put ADMIN_USERNAME
wrangler secret put ADMIN_PASSWORD_HASH
wrangler secret put SESSION_SECRET
```

### Static Asset Routing Behavior

With `run_worker_first` configured:
- `/` → Serves `public/pages/index.html` directly (no Worker)
- `/about` → Serves `public/pages/about.html` directly (no Worker)
- `/styles/*` → Serves static CSS files directly
- `/components/*` → Serves static JS files directly
- `/api/*` → Invokes Worker for API handling
- `/s/:slug` → Invokes Worker for tracking redirect
- `/blog/:slug` → Invokes Worker to fetch post and render
- `/admin/*` → Invokes Worker for auth check + page serving

This means most static assets are served at edge speed without Worker invocation.

---

## Visual Design

### Neo-Brutalist Aesthetic
- Bold, blocky layouts with strong borders
- Intentional "raw" feel with visible structure
- High contrast color schemes
- Typography-forward design with bold sans-serif fonts

### Color Themes

| Element | Dark Mode | Light Mode |
|---------|-----------|------------|
| Background | Black (`#0a0a0a`) | White (`#fafafa`) |
| Primary | Orange (`#ff6b00`) | Blue (`#0066ff`) |
| Accent (interactions) | Blue (`#0066ff`) | Orange (`#ff6b00`) |
| Text | White (`#ffffff`) | Black (`#1a1a1a`) |
| Borders | Orange (`#ff6b00`) | Blue (`#0066ff`) |

### Mountain Peak Iconography
- Subtle geometric peak shapes in headers/dividers
- SVG peak silhouette in logo/favicon
- Peak motif in section separators (black peaks on orange, or inverse)
- NOT overused - accent element only

### Layout Constraints
- Max content width: `768px` (prose) / `1024px` (portfolio grid)
- Centered with generous margins on widescreen
- Mobile-first responsive design

---

## User-Facing Site

### Pages

#### 1. Home / Portfolio (`/`)
- Hero section with name "Garrett Peake" and brief tagline
- Mountain peak accent in hero
- Recent projects grid (3-6 items)
- Each project: thumbnail, title, brief description, tech tags
- Link to full blog for more content

#### 2. Blog (`/blog`)
- List of published posts
- Each post shows: title, date, excerpt, read time
- Pagination or infinite scroll
- Optional: category/tag filtering

#### 3. Blog Post (`/blog/:slug`)
- Full rendered post with macro support
- Title, publish date, read time
- Rendered markdown with embedded macros
- Share buttons (optional)

#### 4. About (`/about`)
- Personal bio
- Professional background
- Contact information / social links
- Mountain peak decorative element

#### 5. Draft Preview (`/draft/share/:uuid`)
- Same layout as blog post
- Banner indicating "Draft Preview"
- No indexing (noindex meta tag)
- UUID is one-time generated, revocable

#### 6. Tracking Redirect (`/s/:slug`)
- Short slug (e.g., `/s/asfq3` or `/s/fb`)
- On visit:
  1. Save slug to `localStorage` for cross-page tracking
  2. Send tracking event to backend (timestamp, user-agent, referrer)
  3. Redirect to `/`
- All subsequent page views include slug in analytics if present in localStorage

---

## Recruiter / Visitor Tracking

### Purpose
Generate unique shareable links to track whether specific recruiters/contacts actually visit the site.

### Flow
1. Admin creates tracking slug with tag (e.g., "Facebook")
   - System suggests random 5-char slug (e.g., `asfq3`)
   - Admin can override with custom slug (e.g., `fb` for a cleaner URL)
2. Admin shares `https://gpeake.com/s/asfq3` (or `/s/fb`) with recruiter
3. Recruiter clicks link:
   - Frontend stores `asfq3` in `localStorage.trackingSlug`
   - POST to `/api/track` with slug + metadata
   - Redirect to `/`
4. As recruiter navigates, each page view sends tracking data with slug
5. Admin dashboard shows which slugs have been visited and activity

### Tracked Data
```typescript
interface TrackingEvent {
  timestamp: string;      // ISO timestamp
  page: string;           // URL path visited
  referrer?: string;      // HTTP referrer on first visit
  userAgent?: string;     // Browser info
}

interface TrackingSlug {
  slug: string;           // Short identifier (custom or random 5-char)
  tag: string;            // Human label (e.g., "Facebook")
  createdAt: string;
  visited: boolean;
  events: TrackingEvent[];
}
```

---

## Admin-Facing CRM

### Authentication
- Single admin user
- Username/password authentication
- Session token stored in cookie (HTTP-only, secure)
- Protected routes under `/admin/*`

### Pages

#### 1. Login (`/admin/login`)
- Simple username/password form
- Rate limiting on failed attempts

#### 2. Dashboard (`/admin`)
- Quick stats: draft count, post count, active tracking slugs
- Recent drafts list
- Recent posts list
- Tracking slugs overview (tag, visited status)
- Quick actions: New Draft, New Tracking Link, View Site

#### 3. Drafts List (`/admin/drafts`)
- Table/list of all drafts
- Columns: title, created, modified, actions
- Actions: Edit, Preview, Publish, Share Link, Delete

#### 4. Posts List (`/admin/posts`)
- Table/list of all published posts
- Columns: title, slug, published date, actions
- Actions: Edit, Unpublish (to draft), Delete

#### 5. Editor (`/admin/editor/:id?`)
- Custom markdown editor with live preview
- Split pane: raw markdown left, rendered preview right
- Toolbar for common formatting + macro insertion
- **Drag-and-drop file upload:**
  - Drop image/file onto editor
  - Upload to R2, receive URL
  - Auto-insert markdown link at cursor position
- Auto-save drafts
- Fields: title, slug (auto-generated, editable), content
- Actions: Save Draft, Preview, Publish

#### 6. Tracking Links (`/admin/tracking`)
- Create new tracking slug:
  - Enter tag name (e.g., "Facebook Recruiter")
  - System suggests random 5-char slug
  - Optional: override with custom slug (e.g., `fb`)
  - Validation: slug must be unique, alphanumeric, 2-10 chars
- Table of all tracking slugs:
  - Columns: tag, slug, created, visited (yes/no), view count, last visit
  - Actions: Copy Link, View Events, Delete
- Click row to expand event timeline for that slug

---

## Macro System

### Syntax Design

**Convention:**
- **camelCase** = inline (flows with text as `<span>`)
- **PascalCase** = block (breaks onto own line/section as block element)

```
Inline syntax:  /macroName(args)
Block syntax:   /MacroName(args)
```

This is intuitive and requires no special markers—the parser determines behavior from the first character's case.

### MVP Scope

For the initial release, only `/Banner` is implemented. The macro system is designed to be extensible for future additions.

### Block Macros (PascalCase) - MVP

| Macro | Usage | Output |
|-------|-------|--------|
| `/Banner(height, text, subtext, color)` | Hero banner | Full-width banner section |

### Future Macros (Post-MVP)

**Inline (camelCase):**
- `/mention("url")` → Styled pill link
- `/highlight("text")` → Highlighted span
- `/kbd("Ctrl+C")` → Styled kbd element
- `/tag("typescript")` → Colored tag pill

**Block (PascalCase):**
- `/Callout(type, title, content)` → Info/warning box
- `/Code(language, code)` → Syntax-highlighted block
- `/Image(src, alt, caption)` → Figure element
- `/ProjectCard(title, desc, image, link)` → Project showcase card
- `/Divider(style)` → Section break with peak motif

### Macro Parsing Flow
1. Parse markdown to HTML
2. Identify macro patterns via regex: `/([a-zA-Z]+)\(([^)]*)\)/`
3. Check first character case to determine inline vs block
4. Look up macro in registry, render with arguments
5. Insert rendered HTML in place of macro syntax

---

## Backend API (Cloudflare Workers)

### Data Models

```typescript
interface Draft {
  id: string;           // UUID
  title: string;
  slug: string;
  content: string;      // Raw markdown with macros
  createdAt: string;    // ISO timestamp
  updatedAt: string;
  shareToken?: string;  // UUID for share link
}

interface Post {
  id: string;           // UUID
  title: string;
  slug: string;         // URL-friendly, unique
  content: string;      // Raw markdown with macros
  publishedAt: string;
  updatedAt: string;
}

interface Session {
  token: string;
  expiresAt: string;
}

interface TrackingSlug {
  slug: string;         // 5-char identifier
  tag: string;          // Human label (e.g., "Facebook")
  createdAt: string;
  events: TrackingEvent[];
}

interface TrackingEvent {
  timestamp: string;
  page: string;
  referrer?: string;
  userAgent?: string;
}
```

### API Endpoints

#### Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/posts` | List published posts (paginated) |
| GET | `/api/posts/:slug` | Get single post by slug |
| GET | `/api/draft/share/:token` | Get draft by share token |
| POST | `/api/track` | Record tracking event (slug in body) |

#### Admin (requires auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login, returns session token |
| POST | `/api/auth/logout` | Invalidate session |
| GET | `/api/admin/drafts` | List all drafts |
| POST | `/api/admin/drafts` | Create new draft |
| GET | `/api/admin/drafts/:id` | Get draft by ID |
| PUT | `/api/admin/drafts/:id` | Update draft |
| DELETE | `/api/admin/drafts/:id` | Delete draft |
| POST | `/api/admin/drafts/:id/share` | Generate/regenerate share link |
| DELETE | `/api/admin/drafts/:id/share` | Revoke share link |
| POST | `/api/admin/drafts/:id/publish` | Publish draft → post |
| GET | `/api/admin/posts` | List all posts |
| PUT | `/api/admin/posts/:id` | Update post |
| DELETE | `/api/admin/posts/:id` | Delete post |
| POST | `/api/admin/posts/:id/unpublish` | Unpublish post → draft |
| POST | `/api/admin/upload` | Upload file to R2, returns URL |
| GET | `/api/admin/tracking` | List all tracking slugs |
| POST | `/api/admin/tracking` | Create new tracking slug |
| GET | `/api/admin/tracking/:slug` | Get tracking slug with events |
| DELETE | `/api/admin/tracking/:slug` | Delete tracking slug |

### Storage Strategy

**Single-Table KV Design**

All data stored in one KV namespace with prefixed keys:

| Prefix | Key Format | Value |
|--------|------------|-------|
| `draft:` | `draft:{uuid}` | Draft JSON |
| `post:` | `post:{uuid}` | Post JSON |
| `post-slug:` | `post-slug:{slug}` | Post UUID (lookup) |
| `share:` | `share:{token}` | Draft UUID (lookup) |
| `session:` | `session:{token}` | Session JSON |
| `tracking:` | `tracking:{slug}` | TrackingSlug JSON |
| `index:drafts` | `index:drafts` | Array of draft UUIDs |
| `index:posts` | `index:posts` | Array of post UUIDs |
| `index:tracking` | `index:tracking` | Array of tracking slugs |

**Index Management:**
- Maintain index arrays for listing operations
- Update index on create/delete operations
- Trade-off: slight write overhead for fast reads

**Cloudflare R2:**
- Bucket: `gpeake-uploads`
- Key format: `{timestamp}-{random}.{ext}`
- Public URL: `https://files.gpeake.com/{key}` (via R2 custom domain)
- Used for: images, PDFs, any dropped files

**Workers Analytics Engine:**
- Dataset: `page_views`
- Blobs: page path, tracking slug (if present)
- Doubles: timestamp
- Used for: per-post view counts, general analytics

---

## Web Components Architecture

### Why Web Components?
- No build step required
- Native browser support
- Encapsulated styles (Shadow DOM)
- Reusable across pages
- Clean separation of concerns

### Component Structure

```
/public
  /components
    /core
      gp-header.js       # Site header with nav
      gp-footer.js       # Site footer
      gp-theme-toggle.js # Dark/light mode switch
      gp-peak-divider.js # Mountain peak separator
    /content
      gp-post-card.js    # Blog post preview card
      gp-project-card.js # Portfolio project card
      gp-post-view.js    # Full post renderer
    /macros
      gp-banner.js       # Banner macro component (MVP)
    /admin
      gp-editor.js       # Markdown editor with drag-drop upload
      gp-preview.js      # Live preview pane
      gp-draft-list.js   # Drafts table
      gp-post-list.js    # Posts table
      gp-tracking-list.js # Tracking slugs table
    /tracking
      gp-tracker.js      # Client-side tracking (localStorage + beacon)
```

### Example Web Component

```javascript
// /public/components/core/gp-peak-divider.js

class GpPeakDivider extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 40px;
          margin: 2rem 0;
        }
        svg {
          width: 100%;
          height: 100%;
        }
        .peak {
          fill: var(--color-primary, #ff6b00);
        }
      </style>
      <svg viewBox="0 0 100 20" preserveAspectRatio="none">
        <polygon class="peak" points="0,20 15,5 25,15 40,0 55,12 70,3 85,18 100,8 100,20" />
      </svg>
    `;
  }
}

customElements.define('gp-peak-divider', GpPeakDivider);
```

### Loading Components

```html
<!-- In HTML head or before use -->
<script type="module" src="/components/core/gp-header.js"></script>
<script type="module" src="/components/core/gp-peak-divider.js"></script>

<!-- Usage -->
<gp-header></gp-header>
<main>
  <h1>Welcome</h1>
  <gp-peak-divider></gp-peak-divider>
  <p>Content here...</p>
</main>
```

### Theming with CSS Custom Properties

```css
/* /public/styles/theme.css */

:root {
  /* Light mode (default) */
  --color-bg: #fafafa;
  --color-text: #1a1a1a;
  --color-primary: #0066ff;
  --color-accent: #ff6b00;
  --color-border: #0066ff;
}

[data-theme="dark"] {
  --color-bg: #0a0a0a;
  --color-text: #ffffff;
  --color-primary: #ff6b00;
  --color-accent: #0066ff;
  --color-border: #ff6b00;
}
```

Components use these CSS custom properties, allowing theme switching without component updates.

---

## File Structure

```
/PersonalSite
├── wrangler.toml           # Cloudflare Workers config
├── package.json
├── tsconfig.json
├── /src
│   ├── index.ts            # Worker entry point, router
│   ├── /routes
│   │   ├── public.ts       # Public page routes
│   │   ├── api.ts          # Public API routes
│   │   └── admin.ts        # Admin routes (authed)
│   ├── /services
│   │   ├── auth.ts         # Authentication logic
│   │   ├── posts.ts        # Post CRUD operations
│   │   ├── drafts.ts       # Draft CRUD operations
│   │   ├── tracking.ts     # Tracking slug operations
│   │   ├── upload.ts       # R2 file upload
│   │   └── analytics.ts    # Analytics Engine writes
│   ├── /lib
│   │   ├── kv.ts           # KV helpers (get, put, index ops)
│   │   └── markdown.ts     # Custom markdown renderer
│   └── /middleware
│       └── auth.ts         # Auth middleware
├── /public
│   ├── /components         # Web components (as above)
│   ├── /styles
│   │   ├── theme.css       # Theme variables
│   │   ├── base.css        # Reset & base styles
│   │   └── utilities.css   # Utility classes
│   ├── /pages
│   │   ├── index.html      # Home/portfolio
│   │   ├── blog.html       # Blog listing
│   │   ├── post.html       # Single post template
│   │   ├── about.html      # About page
│   │   └── /admin
│   │       ├── login.html
│   │       ├── dashboard.html
│   │       ├── drafts.html
│   │       ├── posts.html
│   │       ├── editor.html
│   │       └── tracking.html
│   ├── /lib
│   │   └── markdown.js     # Client-side markdown renderer (shared logic)
│   └── /assets
│       ├── favicon.svg     # Peak favicon
│       └── /images
└── /scripts
    └── seed.ts             # Optional: seed KV with test data
```

---

## Implementation Phases

### Phase 1: Foundation
- [ ] Cloudflare Workers project setup (wrangler.toml, bindings)
- [ ] KV namespace + R2 bucket configuration
- [ ] Basic routing structure
- [ ] KV helper functions (single-table operations)
- [ ] Theme CSS + base styles
- [ ] Core web components (header, footer, theme toggle)

### Phase 2: Custom Markdown Renderer
- [ ] Basic markdown parsing (headings, paragraphs, lists, links, code)
- [ ] Macro syntax parsing (camelCase inline, PascalCase block)
- [ ] Macro registry and rendering
- [ ] Shared renderer for server (TS) and client (JS)

### Phase 3: Public Site
- [ ] Home/portfolio page
- [ ] Blog listing page
- [ ] Single post page with rendered markdown
- [ ] About page
- [ ] Post API endpoints
- [ ] Analytics Engine integration (page views)

### Phase 4: Admin CRM
- [ ] Authentication system (login, sessions)
- [ ] Admin dashboard
- [ ] Drafts CRUD + UI
- [ ] Posts CRUD + UI
- [ ] Share link functionality

### Phase 5: Editor
- [ ] Split-pane editor component (textarea + preview)
- [ ] Live markdown preview using client-side renderer
- [ ] Drag-and-drop file upload to R2
- [ ] Auto-insert uploaded file links
- [ ] Toolbar for formatting + macro insertion
- [ ] Auto-save drafts

### Phase 6: Tracking System
- [ ] Tracking slug CRUD
- [ ] `/s/:slug` redirect page with localStorage
- [ ] Client-side tracker component (beacon on page views)
- [ ] Admin tracking dashboard with event timeline

### Phase 7: Polish
- [ ] Mobile responsiveness
- [ ] Performance optimization
- [ ] SEO meta tags
- [ ] Error pages (404, 500)
- [ ] Rate limiting on auth endpoints

---

## Open Questions

1. **Comments:** Future consideration or out of scope?
2. **RSS Feed:** Include for blog posts?
3. **Search:** Client-side search across posts or out of scope?
