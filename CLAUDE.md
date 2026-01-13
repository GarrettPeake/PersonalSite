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
- [x] Custom markdown renderer with macro support
- [x] `/Banner` macro implementation
- [x] Core web components (header, footer, theme toggle, peak divider)
- [x] Tracking component (gp-tracker)
- [x] Public pages (home, blog listing, about)
- [x] Tracking redirect page (`/s/:slug`)

### Not Yet Implemented

- [ ] Blog post detail pages (Worker-rendered)
- [ ] Admin authentication
- [ ] Admin CRM (drafts, posts, editor)
- [ ] File upload to R2
- [ ] Analytics Engine integration
- [ ] API endpoints (currently return 501)

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
│   └── /lib
│       ├── kv.ts         # KV helper functions (CRUD operations)
│       └── markdown.ts   # Custom markdown renderer with macros
└── /public
    ├── index.html        # Home page
    ├── about.html        # About page
    ├── blog.html         # Blog listing page
    ├── /styles
    │   ├── theme.css     # CSS custom properties for theming
    │   └── base.css      # Reset and base styles
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
- `ADMIN_PASSWORD_HASH` - Bcrypt hash of password
- `SESSION_SECRET` - Random string for session signing

## Design Decisions

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

## Next Steps

1. Implement API endpoints for posts (`GET /api/posts`, `GET /api/posts/:slug`)
2. Implement tracking API endpoint (`POST /api/track`)
3. Build blog post detail page (Worker-rendered HTML)
4. Build admin authentication system
5. Create admin dashboard and editor UI
6. Implement file upload to R2

---

## Contribution Guidelines

**IMPORTANT:** Every contribution to this repository MUST update this CLAUDE.md file to reflect the current state of the project. This includes:

- Adding newly implemented features to the "Implemented" checklist
- Removing completed items from "Not Yet Implemented"
- Updating the "File Structure" section when new files are added
- Documenting any new patterns, conventions, or design decisions
- Keeping "Next Steps" current

This ensures CLAUDE.md remains an accurate representation of what exists in the codebase right now, as distinct from DESIGN.md which represents the end goal.
