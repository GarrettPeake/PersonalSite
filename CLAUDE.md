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

### Not Yet Implemented

- [ ] Custom markdown renderer
- [ ] Macro system (only `/Banner` in MVP scope)
- [ ] Blog post pages
- [ ] Admin authentication
- [ ] Admin CRM (drafts, posts, editor)
- [ ] Recruiter tracking system
- [ ] File upload to R2
- [ ] Analytics Engine integration
- [ ] Web components

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
│   └── types.ts          # TypeScript types and KV prefixes
└── /public
    ├── index.html        # Placeholder home page
    └── /styles
        ├── theme.css     # CSS custom properties for theming
        └── base.css      # Reset and base styles
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

## Next Steps

1. Implement KV helper functions (`src/lib/kv.ts`)
2. Build custom markdown renderer (`src/lib/markdown.ts`)
3. Create core web components (header, footer, theme toggle)
4. Implement public pages (home, blog, about)
5. Build admin authentication system
6. Create editor with live preview
