# Garrett Peake Personal Website - Design Document

## Overview

A personal website built on Cloudflare Workers with a neo-brutalist aesthetic, featuring a portfolio, blog, and admin CRM with a macro-enriched markdown editor.

**Tech Stack:**
- Frontend: Vanilla HTML, CSS, JS with Web Components (no build step)
- Backend: Cloudflare Workers (TypeScript)
- Storage: Cloudflare KV (single-table design)
- Files: Cloudflare R2 (images, uploads)
- Analytics: Workers Analytics Engine

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
- 5-character slug (e.g., `/s/asfq3`)
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
1. Admin creates tracking slug with tag (e.g., "Facebook" → `asfq3`)
2. Admin shares `https://garrettpeake.com/s/asfq3` with recruiter
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
  slug: string;           // 5-char identifier
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
- Create new tracking slug: enter tag name → generate 5-char slug
- Table of all tracking slugs:
  - Columns: tag, slug, created, visited (yes/no), view count, last visit
  - Actions: Copy Link, View Events, Delete
- Click row to expand event timeline for that slug

---

## Macro System

### Syntax Design

**Recommendation:** Use a registry-based approach where macro names are pre-defined as either inline or block. The parser knows from the macro name how to handle it.

```
Inline syntax:  /macroName(args)
Block syntax:   /MacroName(args)
```

**Convention:**
- **camelCase** = inline (flows with text)
- **PascalCase** = block (breaks onto own line/section)

This is intuitive and requires no special markers.

### Inline Macros (camelCase)
Render as styled `<span>` elements within paragraph flow.

| Macro | Usage | Output |
|-------|-------|--------|
| `/mention("url")` | Link to person/repo | Styled pill link |
| `/highlight("text")` | Emphasized text | Highlighted span |
| `/kbd("Ctrl+C")` | Keyboard shortcut | Styled kbd element |
| `/tag("typescript")` | Topic tag | Colored tag pill |

### Block Macros (PascalCase)
Render as full-width block elements, breaking text flow.

| Macro | Usage | Output |
|-------|-------|--------|
| `/Banner(height, text, subtext, color)` | Hero banner | Full-width banner section |
| `/Callout(type, title, content)` | Info/warning box | Styled callout block |
| `/Code(language, code)` | Code block | Syntax-highlighted block |
| `/Image(src, alt, caption)` | Image with caption | Figure element |
| `/ProjectCard(title, desc, image, link)` | Project showcase | Card component |
| `/Divider(style)` | Section break | Styled hr with peak motif |

### Macro Parsing Flow
1. Parse markdown to AST
2. Walk AST and identify macro patterns via regex: `/([a-zA-Z]+)\(([^)]*)\)/`
3. Check first character case to determine inline vs block
4. Replace with appropriate HTML/component
5. Render final HTML

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
- Bucket: `uploads`
- Key format: `{timestamp}-{random}.{ext}`
- Public URL: `https://files.garrettpeake.com/{key}`
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
      gp-banner.js       # Banner macro component
      gp-callout.js      # Callout macro component
      gp-mention.js      # Mention macro component
      gp-tag.js          # Tag pill component
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
