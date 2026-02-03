# gpeake.com

Personal website for Garrett Peake, built on Cloudflare Workers with a neo-brutalist aesthetic.

**Live:** [gpeake.com](https://gpeake.com)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vanilla HTML, CSS, JS with Web Components |
| Backend | Cloudflare Workers (TypeScript) |
| Storage | Cloudflare KV (single-table design) |
| Files | Cloudflare R2 via `files.gpeake.com` |
| Analytics | Workers Analytics Engine |

## Features

- **SPA architecture** with client-side routing and carousel transitions
- **Blog** with custom markdown editor, macro system, and draft sharing
- **Photography** page with photo uploads (EXIF stripping)
- **Projects** portfolio with drag-and-drop reorder
- **CMS-editable about page** with live preview
- **Recruiter tracking** via short links (`/s/:slug`) with event timelines
- **Admin dashboard** with session-based auth
- **Dark/light theme** with mountain peak iconography

## Development

### Prerequisites

- Node.js
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

### Setup

```bash
npm install
```

### Commands

```bash
npm run dev           # Start local dev server
npm run deploy        # Deploy to Cloudflare
npm run typecheck     # TypeScript type checking
npm test              # Run tests
npm run test:watch    # Tests in watch mode
npm run test:coverage # Tests with coverage
```

### Secrets

Set via `wrangler secret put <name>`:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH` (format: `$simple$<salt>$<sha256>`)
- `SESSION_SECRET`

## Architecture

The backend uses a modular DAO pattern with handlers split by route type. All data lives in a single KV namespace with prefixed keys (e.g., `post:{uuid}`, `draft:{uuid}`, `index:posts`).

The frontend is a full SPA served from a single `index.html` shell. The Worker handles API routes, tracking redirects, sitemap generation, and admin pages. Static assets are served directly by Cloudflare.

See [CLAUDE.md](CLAUDE.md) for detailed architecture documentation and [DESIGN.md](DESIGN.md) for the full design spec.
