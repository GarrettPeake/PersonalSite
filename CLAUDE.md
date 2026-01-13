# CLAUDE.md - Project Context

This file documents the current state of the gpeake.com personal website project. For the full design and end-goal, see `DESIGN.md`.

## Project Overview

Personal website for Garrett Peake built on Cloudflare Workers with a neo-brutalist aesthetic.

**Domain:** `gpeake.com`
**Files CDN:** `files.gpeake.com`

## Current State

### Implemented

- [x] Project scaffolding (npm, TypeScript, Wrangler)
- [x] Cloudflare bindings configured (KV, R2, Analytics Engine)
- [x] Basic Worker entry point with route handling skeleton
- [x] Static asset configuration with `run_worker_first` routing
- [x] Theme CSS variables (light/dark mode)
- [x] Base CSS reset and typography
- [x] KV helper functions (CRUD for drafts, posts, tracking, sessions)
- [x] Custom markdown renderer with macro support (server + client)
- [x] `/Banner` macro implementation
- [x] Core web components (header, footer, theme toggle, peak divider)
- [x] Tracking component (gp-tracker)
- [x] Public pages (home, blog listing, about)
- [x] Tracking redirect page (`/s/:slug`)
- [x] Public API endpoints (`GET /api/posts`, `GET /api/posts/:slug`, `POST /api/track`)
- [x] Blog post detail pages (Worker-rendered with markdown)
- [x] Draft preview pages (`/draft/share/:token`)
- [x] Admin authentication (session-based with cookies)
- [x] Admin login page
- [x] Admin dashboard with stats
- [x] Admin editor UI with split-pane live preview
- [x] Admin posts list page
- [x] Admin drafts list page
- [x] Admin tracking management page
- [x] Client-side markdown renderer for editor preview

### Not Yet Implemented

- [ ] File upload to R2
- [ ] Analytics Engine integration

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vanilla HTML, CSS, JS with Web Components |
| Backend | Cloudflare Workers (TypeScript) |
| Storage | Cloudflare KV (single-table design) |
| Files | Cloudflare R2 (`gpeake-files` bucket) |
| Analytics | Workers Analytics Engine |

## Cloudflare Bindings

```
KV        → env.KV       (namespace: gpeake-data, id: 255ea6f6b3514decb5483765d99cf66a)
R2        → env.R2       (bucket: gpeake-files)
ANALYTICS → env.ANALYTICS (dataset: page_views)
ASSETS    → env.ASSETS   (static file serving)
```

## KV Single-Table Design

All data uses prefixed keys in a single KV namespace:

| Prefix | Purpose |
|--------|---------|
| `draft:{uuid}` | Draft content |
| `post:{uuid}` | Published post content |
| `post-slug:{slug}` | Slug → UUID lookup |
| `share:{token}` | Share token → draft UUID lookup |
| `session:{token}` | Auth session data |
| `tracking:{slug}` | Tracking slug data + events |
| `index:drafts` | Array of all draft UUIDs |
| `index:posts` | Array of all post UUIDs |
| `index:tracking` | Array of all tracking slugs |

## Routing

Static assets served directly (no Worker) for:
- `/` → `public/index.html`
- `/about` → `public/about.html`
- `/blog` → `public/blog.html`
- `/styles/*`, `/components/*`, `/assets/*`

Worker handles:
- `/api/*` → API endpoints
- `/s/:slug` → Tracking redirect
- `/blog/:slug` → Dynamic post rendering
- `/draft/share/:uuid` → Draft preview
- `/admin/*` → Admin pages (auth required)

## File Structure

```
/PersonalSite
├── wrangler.toml         # Cloudflare config with bindings
├── package.json
├── tsconfig.json
├── DESIGN.md             # Full design spec (end goal)
├── CLAUDE.md             # This file (current state)
├── /src
│   ├── index.ts          # Worker entry point
│   ├── types.ts          # TypeScript types and KV prefixes
│   ├── /lib
│   │   ├── kv.ts         # KV helper functions (CRUD operations)
│   │   └── markdown.ts   # Custom markdown renderer with macros
│   └── /middleware
│       └── auth.ts       # Authentication helpers (login, session, cookies)
└── /public
    ├── index.html        # Home page
    ├── about.html        # About page
    ├── blog.html         # Blog listing page
    ├── /admin
    │   ├── index.html    # Admin dashboard
    │   ├── login.html    # Admin login page
    │   ├── editor.html   # Post/draft editor with live preview
    │   ├── posts.html    # Published posts list
    │   ├── drafts.html   # Drafts list
    │   └── tracking.html # Tracking links management
    ├── /js
    │   ├── blog.js       # Blog listing page logic
    │   └── /admin
    │       ├── login.js      # Login form handling
    │       ├── dashboard.js  # Dashboard stats and recent items
    │       ├── editor.js     # Markdown editor with toolbar and auto-save
    │       ├── posts.js      # Posts list management
    │       ├── drafts.js     # Drafts list management
    │       └── tracking.js   # Tracking links management
    ├── /lib
    │   └── markdown.js   # Client-side markdown renderer for preview
    ├── /styles
    │   ├── theme.css     # CSS custom properties for theming
    │   ├── base.css      # Reset and base styles
    │   ├── admin.css     # Shared admin layout (sidebar, buttons, dialogs)
    │   └── /pages
    │       ├── home.css           # Home page styles
    │       ├── about.css          # About page styles
    │       ├── blog.css           # Blog listing styles
    │       ├── login.css          # Admin login page styles
    │       ├── admin-dashboard.css # Admin dashboard styles
    │       ├── admin-editor.css   # Editor page styles
    │       ├── admin-posts.css    # Posts list styles
    │       ├── admin-drafts.css   # Drafts list styles
    │       └── admin-tracking.css # Tracking page styles
    └── /components
        ├── /core
        │   ├── gp-header.js       # Site header with nav
        │   ├── gp-footer.js       # Site footer
        │   ├── gp-theme-toggle.js # Dark/light mode switch
        │   └── gp-peak-divider.js # Mountain peak separator
        └── /tracking
            └── gp-tracker.js      # Silent page view tracker
```

## Development Commands

```bash
npm run dev        # Start local development server
npm run deploy     # Deploy to Cloudflare
npm run typecheck  # Run TypeScript type checking
```

## Secrets Required

Set via `wrangler secret put <name>`:
- `ADMIN_USERNAME` - Admin login username
- `ADMIN_PASSWORD_HASH` - Password hash (use `$simple$<salt>$<sha256>` format or plain for dev)
- `SESSION_SECRET` - Random string for session signing

## API Endpoints

### Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/posts` | List all posts (with excerpts) |
| GET | `/api/posts/:slug` | Get single post by slug |
| POST | `/api/track` | Record tracking event |

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login, sets session cookie |
| POST | `/api/auth/logout` | Logout, clears session cookie |

### Admin (requires auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/drafts` | List all drafts |
| POST | `/api/admin/drafts` | Create new draft |
| GET | `/api/admin/drafts/:id` | Get draft by ID |
| PUT | `/api/admin/drafts/:id` | Update draft |
| DELETE | `/api/admin/drafts/:id` | Delete draft |
| POST | `/api/admin/drafts/:id/publish` | Publish draft → post |
| POST | `/api/admin/drafts/:id/share` | Create share token |
| GET | `/api/admin/posts` | List all posts |
| GET | `/api/admin/posts/:id` | Get post by ID |
| PUT | `/api/admin/posts/:id` | Update post |
| DELETE | `/api/admin/posts/:id` | Delete post |
| POST | `/api/admin/posts/:id/unpublish` | Unpublish → draft |
| GET | `/api/admin/tracking` | List tracking slugs |
| POST | `/api/admin/tracking` | Create tracking slug |
| GET | `/api/admin/tracking/:slug` | Get tracking with events |
| DELETE | `/api/admin/tracking/:slug` | Delete tracking slug |

## Design Decisions

### Code Organization Requirements

**IMPORTANT:** HTML files MUST only contain HTML markup. All JavaScript and CSS must be in separate files:

- **JavaScript** must be in `/public/js/` or `/public/js/admin/` directories
- **CSS** must be in `/public/styles/` or `/public/styles/pages/` directories
- **HTML** files should only contain markup and reference external JS/CSS via `<link>` and `<script>` tags

This separation ensures:
- Better maintainability and readability
- Easier code reuse (e.g., `admin.css` is shared across all admin pages)
- Cleaner git diffs when making changes
- Browser caching benefits for external resources

### Macro Syntax (from DESIGN.md)
- **camelCase** = inline macro (renders as `<span>`)
- **PascalCase** = block macro (renders as block element)
- MVP: Only `/Banner(height, text, subtext, color)` implemented

### Color Themes
| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Background | `#fafafa` | `#0a0a0a` |
| Primary | `#0066ff` (blue) | `#ff6b00` (orange) |
| Accent | `#ff6b00` (orange) | `#0066ff` (blue) |
| Text | `#1a1a1a` | `#ffffff` |

### KV Helper Functions (`src/lib/kv.ts`)
- `getDraft`, `listDrafts`, `createDraft`, `updateDraft`, `deleteDraft`
- `createShareToken`, `getDraftByShareToken`, `revokeShareToken`
- `getPost`, `getPostBySlug`, `listPosts`, `publishDraft`, `updatePost`, `deletePost`, `unpublishPost`
- `getTrackingSlug`, `listTrackingSlugs`, `createTrackingSlug`, `recordTrackingEvent`, `deleteTrackingSlug`
- `createSession`, `getSession`, `deleteSession`
- `slugify` utility for URL-friendly slugs

### Markdown Renderer (`src/lib/markdown.ts`)
- Supports: headings, paragraphs, lists, blockquotes, code blocks, links, images, bold, italic
- Block macros: `/MacroName(args)` on own line
- Inline macros: `/macroName(args)` within text
- Currently only `/Banner` macro implemented

### Authentication (`src/middleware/auth.ts`)
- Session-based with HTTP-only cookies
- Sessions stored in KV with TTL (7 days default)
- Simple SHA-256 password hashing (format: `$simple$<salt>$<hash>`)

### Admin UI Pages
- **Dashboard** (`/admin/`): Stats overview, recent drafts/posts
- **Editor** (`/admin/editor`): Split-pane markdown editor with live preview, toolbar, keyboard shortcuts (Ctrl+S, Ctrl+B, Ctrl+I), auto-generated slugs
- **Posts** (`/admin/posts`): List published posts with edit/unpublish/delete actions
- **Drafts** (`/admin/drafts`): List drafts with edit/share/publish/delete actions
- **Tracking** (`/admin/tracking`): Create/manage tracking links, view event timelines

### Client-side Markdown Renderer (`public/lib/markdown.js`)
- Mirrors server-side renderer for consistent preview
- Used in editor for live preview
- Supports same macro syntax as server

## Next Steps

1. Implement file upload to R2 (drag-and-drop in editor)
2. Add Analytics Engine integration for page views
3. Add auto-save for drafts in editor
4. Mobile responsiveness improvements
5. SEO meta tags for blog posts

---

## Contribution Guidelines

**IMPORTANT:** Every contribution to this repository MUST update this CLAUDE.md file to reflect the current state of the project. This includes:

- Adding newly implemented features to the "Implemented" checklist
- Removing completed items from "Not Yet Implemented"
- Updating the "File Structure" section when new files are added
- Documenting any new patterns, conventions, or design decisions
- Keeping "Next Steps" current

This ensures CLAUDE.md remains an accurate representation of what exists in the codebase right now, as distinct from DESIGN.md which represents the end goal.
