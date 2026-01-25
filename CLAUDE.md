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
- [x] Theme CSS variables (light/dark mode) with Space Grotesk display font
- [x] Base CSS reset and typography
- [x] Unified component CSS (buttons, cards, forms, dialogs, tables)
- [x] Web components with external shared stylesheet
- [x] KV helper functions (CRUD for drafts, posts, tracking, sessions)
- [x] Custom markdown renderer with macro support (server + client)
- [x] `/Banner` macro implementation
- [x] Core web components (header, footer, theme toggle, peak divider)
- [x] New site header/footer components with mountain peaks theme toggle
- [x] Photo modal component for photography page
- [x] Tracking component (gp-tracker)
- [x] Public pages (home, blog listing, about, photography)
- [x] Neo-brutalist home page with three-panel layout, shelf, and carousel
- [x] Mobile-responsive layouts with hamburger menus
- [x] Tracking redirect page (`/s/:slug`)
- [x] Public API endpoints (`GET /api/posts`, `GET /api/posts/:slug`, `POST /api/track`)
- [x] Blog post detail pages (Worker-rendered with markdown)
- [x] Draft preview pages (`/draft/share/:token`)
- [x] Admin authentication (session-based with cookies)
- [x] Admin login page with neo-brutalist mountain scene theme toggle
- [x] Admin dashboard with stats
- [x] Admin editor UI with split-pane live preview
- [x] Admin posts list page (proper HTML tables)
- [x] Admin drafts list page (proper HTML tables)
- [x] Admin tracking management page (proper HTML tables)
- [x] Client-side markdown renderer for editor preview
- [x] Modular backend architecture (DAOs, handlers, templates)
- [x] Vitest testing infrastructure for Workers
- [x] File upload to R2 (`POST /api/admin/upload`)
- [x] Comprehensive test coverage for all backend modules (527 tests)
- [x] Optional post descriptions for blog listing (replaces auto-generated excerpts)
- [x] Admin photo management page with upload, edit, delete
- [x] Photo CRUD API endpoints (public and admin)
- [x] EXIF stripping on photo upload for privacy
- [x] Public photography page loads from API
- [x] Admin project management page with CRUD and reorder
- [x] Project API endpoints (public and admin)
- [x] Home page dynamically loads projects from API

### Not Yet Implemented

- [ ] Analytics Engine integration for page views

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
| `photo:{uuid}` | Photo metadata |
| `project:{uuid}` | Project metadata with content pieces |
| `index:drafts` | Array of all draft UUIDs |
| `index:posts` | Array of all post UUIDs |
| `index:tracking` | Array of all tracking slugs |
| `index:photos` | Array of all photo UUIDs |
| `index:projects` | Array of all project UUIDs |

## Routing

Static assets served directly (no Worker) for:
- `/` → `public/index.html`
- `/about` → `public/about.html`
- `/blog` → `public/blog.html`
- `/photography` → `public/photography.html`
- `/styles/*`, `/components/*`, `/assets/*`, `/js/*`

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
├── vitest.config.ts      # Vitest configuration for Workers testing
├── DESIGN.md             # Full design spec (end goal)
├── CLAUDE.md             # This file (current state)
├── /src
│   ├── index.ts          # Worker entry point (router only)
│   ├── types.ts          # TypeScript types and KV prefixes
│   ├── /dao              # Data Access Objects (one per entity)
│   │   ├── base.ts       # Shared index management utilities
│   │   ├── draft.dao.ts  # Draft CRUD + sharing operations
│   │   ├── post.dao.ts   # Post CRUD + publish/unpublish
│   │   ├── tracking.dao.ts # Tracking CRUD + events
│   │   ├── session.dao.ts  # Session CRUD
│   │   ├── photo.dao.ts  # Photo CRUD operations
│   │   └── project.dao.ts # Project CRUD + reorder operations
│   ├── /handlers
│   │   ├── /api
│   │   │   ├── public.ts    # GET /api/posts, POST /api/track
│   │   │   ├── auth.ts      # POST /api/auth/login|logout
│   │   │   ├── drafts.ts    # /api/admin/drafts/* endpoints
│   │   │   ├── posts.ts     # /api/admin/posts/* endpoints
│   │   │   ├── tracking.ts  # /api/admin/tracking/* endpoints
│   │   │   ├── upload.ts    # POST /api/admin/upload
│   │   │   ├── photos.ts    # /api/photos and /api/admin/photos/* endpoints
│   │   │   └── projects.ts  # /api/projects and /api/admin/projects/* endpoints
│   │   └── /pages
│   │       ├── blog.ts      # /blog/:slug handler
│   │       ├── draft.ts     # /draft/share/:token handler
│   │       ├── tracking.ts  # /s/:slug handler
│   │       └── admin.ts     # /admin/* auth guard
│   ├── /templates
│   │   ├── post.ts          # Blog post page template
│   │   └── tracking-redirect.ts # Tracking redirect page template
│   ├── /lib
│   │   ├── kv.ts         # DEPRECATED: Use DAOs instead
│   │   ├── markdown.ts   # Custom markdown renderer with macros
│   │   ├── response.ts   # HTTP response helpers (jsonResponse, corsHeaders)
│   │   ├── utils.ts      # Shared utilities (escapeHtml, formatDate, etc.)
│   │   └── exif.ts       # EXIF stripping utility for JPEG images
│   ├── /middleware
│   │   └── auth.ts       # Authentication helpers (login, session, cookies)
│   └── /__tests__
│       ├── router.test.ts # Router unit tests
│       ├── /dao
│       │   ├── base.test.ts
│       │   ├── draft.dao.test.ts
│       │   ├── post.dao.test.ts
│       │   ├── tracking.dao.test.ts
│       │   ├── session.dao.test.ts
│       │   ├── photo.dao.test.ts
│       │   └── project.dao.test.ts
│       ├── /handlers
│       │   ├── /api
│       │   │   ├── public.test.ts
│       │   │   ├── auth.test.ts
│       │   │   ├── drafts.test.ts
│       │   │   ├── posts.test.ts
│       │   │   ├── tracking.test.ts
│       │   │   ├── upload.test.ts
│       │   │   ├── photos.test.ts
│       │   │   └── projects.test.ts
│       │   └── /pages
│       │       ├── blog.test.ts
│       │       ├── draft.test.ts
│       │       ├── tracking.test.ts
│       │       └── admin.test.ts
│       ├── /lib
│       │   ├── utils.test.ts
│       │   ├── markdown.test.ts
│       │   ├── response.test.ts
│       │   └── exif.test.ts
│       ├── /middleware
│       │   └── auth.test.ts
│       └── /templates
│           ├── post.test.ts
│           └── tracking-redirect.test.ts
└── /public
    ├── index.html        # Home page (neo-brutalist three-panel layout)
    ├── about.html        # About page
    ├── blog.html         # Blog listing page
    ├── photography.html  # Photography gallery page
    ├── /admin
    │   ├── index.html    # Admin dashboard
    │   ├── login.html    # Admin login page
    │   ├── editor.html   # Post/draft editor with live preview
    │   ├── posts.html    # Published posts list
    │   ├── drafts.html   # Drafts list
    │   ├── photos.html   # Photo management
    │   ├── projects.html # Project management with reorder
    │   └── tracking.html # Tracking links management
    ├── /js
    │   ├── blog.js       # Blog listing page logic
    │   ├── home.js       # Home page interactions (theme, shelf, carousel)
    │   ├── photography.js # Photography gallery modal handling
    │   └── /admin
    │       ├── login.js      # Login form handling
    │       ├── dashboard.js  # Dashboard stats and recent items
    │       ├── editor.js     # Markdown editor with toolbar and auto-save
    │       ├── posts.js      # Posts list management
    │       ├── drafts.js     # Drafts list management
    │       ├── photos.js     # Photo management
    │       ├── projects.js   # Project management with reorder
    │       └── tracking.js   # Tracking links management
    ├── /lib
    │   └── markdown.js   # Client-side markdown renderer for preview
    ├── /styles
    │   ├── theme.css         # CSS custom properties (colors, fonts, spacing)
    │   ├── base.css          # Reset, typography, layout utilities
    │   ├── components.css    # Reusable UI components (buttons, cards, forms)
    │   ├── web-components.css # Shared styles for Shadow DOM components
    │   ├── admin.css         # Admin-specific layout (sidebar, header)
    │   └── /pages
    │       ├── home.css           # Home page three-panel layout
    │       ├── about.css          # About page with image frame
    │       ├── blog.css           # Blog listing with thin borders
    │       ├── photography.css    # Photo grid and modal styles
    │       ├── login.css          # Admin login page styles
    │       ├── admin-dashboard.css # Admin dashboard styles
    │       ├── admin-editor.css   # Editor page styles
    │       ├── admin-posts.css    # Posts list styles
    │       ├── admin-drafts.css   # Drafts list styles
    │       ├── admin-photos.css   # Photo management styles
    │       ├── admin-projects.css # Project management styles
    │       └── admin-tracking.css # Tracking page styles
    └── /components
        ├── /core
        │   ├── gp-header.js       # Legacy site header with nav
        │   ├── gp-footer.js       # Legacy site footer
        │   ├── gp-site-header.js  # New header with mountain peaks toggle
        │   ├── gp-site-footer.js  # New minimal footer (copyright only)
        │   ├── gp-theme-toggle.js # Dark/light mode switch
        │   ├── gp-peak-divider.js # Mountain peak separator
        │   └── gp-photo-modal.js  # Photography modal component
        └── /tracking
            └── gp-tracker.js      # Silent page view tracker
```

## Development Commands

```bash
npm run dev           # Start local development server
npm run deploy        # Deploy to Cloudflare
npm run typecheck     # Run TypeScript type checking
npm test              # Run tests once
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
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
| GET | `/api/draft/share/:token` | Get draft by share token |
| GET | `/api/photos` | List all photos |
| GET | `/api/projects` | List all projects |

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
| DELETE | `/api/admin/drafts/:id/share` | Revoke share token |
| GET | `/api/admin/posts` | List all posts |
| GET | `/api/admin/posts/:id` | Get post by ID |
| PUT | `/api/admin/posts/:id` | Update post |
| DELETE | `/api/admin/posts/:id` | Delete post |
| POST | `/api/admin/posts/:id/unpublish` | Unpublish → draft |
| GET | `/api/admin/tracking` | List tracking slugs |
| POST | `/api/admin/tracking` | Create tracking slug |
| GET | `/api/admin/tracking/:slug` | Get tracking with events |
| DELETE | `/api/admin/tracking/:slug` | Delete tracking slug |
| POST | `/api/admin/upload` | Upload file to R2 |
| GET | `/api/admin/photos` | List all photos |
| POST | `/api/admin/photos` | Upload new photo (strips EXIF) |
| GET | `/api/admin/photos/:id` | Get photo by ID |
| PUT | `/api/admin/photos/:id` | Update photo metadata |
| DELETE | `/api/admin/photos/:id` | Delete photo |
| GET | `/api/admin/projects` | List all projects |
| POST | `/api/admin/projects` | Create new project |
| GET | `/api/admin/projects/:id` | Get project by ID |
| PUT | `/api/admin/projects/:id` | Update project |
| DELETE | `/api/admin/projects/:id` | Delete project |
| PUT | `/api/admin/projects/reorder` | Reorder projects |

## CSS Architecture

The CSS is organized into layers that build on each other. Always include stylesheets in this order:

### Import Order

```html
<!-- Required for all pages -->
<link rel="stylesheet" href="/styles/theme.css">
<link rel="stylesheet" href="/styles/base.css">
<link rel="stylesheet" href="/styles/components.css">

<!-- For admin pages, add: -->
<link rel="stylesheet" href="/styles/admin.css">

<!-- Then page-specific styles -->
<link rel="stylesheet" href="/styles/pages/[page-name].css">
```

### Stylesheet Purposes

| File | Purpose | When to Use |
|------|---------|-------------|
| `theme.css` | CSS custom properties (colors, spacing, fonts) | Always include first |
| `base.css` | Reset, typography, containers, `body.page` layout | Always include second |
| `components.css` | Buttons, cards, forms, dialogs, tables, utilities | When using any UI components |
| `web-components.css` | Shared styles for Shadow DOM web components | Linked inside Shadow DOM |
| `admin.css` | Admin sidebar, header, navigation | Admin pages only |
| `pages/*.css` | Page-specific layouts and overrides | One per page |

### CSS Custom Properties (theme.css)

```css
/* Colors - switch automatically with data-theme="dark" */
--color-bg            /* Page background */
--color-text          /* Text color */
--color-primary       /* Primary action color (blue/orange) */
--color-accent        /* Accent color (orange/blue) */
--color-border        /* Border color */
--color-bg-secondary  /* Secondary background (cards, inputs) */
--color-text-muted    /* Muted text color */

/* Spacing scale */
--space-xs: 0.25rem;
--space-sm: 0.5rem;
--space-md: 1rem;
--space-lg: 2rem;
--space-xl: 4rem;
--space-2xl: 6rem;

/* Layout */
--max-width-prose: 768px;   /* Content width */
--max-width-wide: 1024px;   /* Full layout width */
--max-width-full: 1400px;   /* Maximum page width */
--panel-right-width: 320px; /* Home page shelf panel */

/* Border widths - neo-brutalist thin lines */
--border-thin: 1px;
--border-medium: 2px;

/* Typography */
--font-sans     /* System font stack */
--font-mono     /* Monospace font stack */
--font-display  /* Space Grotesk for hero typography */

/* Animation */
--transition-fast: 0.15s ease;
--transition-medium: 0.3s ease;
--transition-slow: 0.5s ease;

/* Z-index layers */
--z-dropdown: 100;
--z-sticky: 200;
--z-modal: 1000;
```

### Component Classes (components.css)

#### Buttons

| Class | Use For | Example |
|-------|---------|---------|
| `.btn` | Base button (required) | All buttons |
| `.btn--primary` | Main actions | Save, Publish, Create |
| `.btn--secondary` | Secondary actions | Cancel, Preview |
| `.btn--danger` | Destructive actions | Delete |
| `.btn--ghost-danger` | Danger on hover only | Inline delete buttons |
| `.btn--sm` | Compact buttons in tables/lists | Edit, Share |
| `.btn--block` | Full-width button | Login form submit |
| `.btn--icon` | 36x36 icon-only button | Theme toggle, social links |

```html
<button class="btn btn--primary">Publish</button>
<button class="btn btn--sm">Edit</button>
<a href="#" class="btn btn--secondary">Cancel</a>
```

#### Cards

| Class | Use For |
|-------|---------|
| `.card` | Base bordered container |
| `.card--thick` | 3px border variant |
| `.card--interactive` | Lift effect on hover (blog posts) |
| `.card--stat` | Centered stat display with `.card__value` and `.card__label` |

#### Forms

| Class | Use For |
|-------|---------|
| `.form-group` | Wrapper for label + input |
| `.form-label` | Standalone label styling |
| `.form-input` | Standalone input styling |
| `.form-input--mono` | Monospace input (slugs, URLs) |
| `.form-help` | Help text below inputs |
| `.error` | Error message banner |

```html
<div class="form-group">
  <label for="name">Name</label>
  <input type="text" id="name" required>
  <p class="form-help">Enter your full name</p>
</div>
```

#### Data Tables (Admin)

Use proper HTML `<table>` elements with these classes:

| Class | Use For |
|-------|---------|
| `.table-wrapper` | Scrollable container for tables |
| `.admin-table` | Main table element with neo-brutalist styling |
| `.col-title` | Title column (40% width) |
| `.col-slug` | Slug column (25% width) |
| `.col-date` | Date column (15% width) |
| `.col-status` | Status column (10% width) |
| `.col-actions` | Actions column (right-aligned) |
| `.cell-truncate` | Truncate text with ellipsis |

```html
<div class="table-wrapper">
  <table class="admin-table">
    <thead>
      <tr>
        <th class="col-title">Title</th>
        <th class="col-date">Date</th>
        <th class="col-actions">Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Post Title</td>
        <td>Jan 1, 2024</td>
        <td><button class="btn-action">Edit</button></td>
      </tr>
    </tbody>
  </table>
</div>
```

#### Dialogs

| Class | Use For |
|-------|---------|
| `.dialog-overlay` | Full-screen backdrop |
| `.dialog` | Modal container |
| `.dialog__title` | Dialog heading |
| `.dialog__content` | Dialog body text |
| `.dialog__actions` | Button row (right-aligned) |

#### Item Lists

| Class | Use For |
|-------|---------|
| `.item-list` | Container with border |
| `.item-row` | Flex row with dashed separator |

#### Status Indicators

| Class | Use For |
|-------|---------|
| `.status-dot` | 8px circular indicator |
| `.status-dot--active` | Green dot |
| `.status-dot--warning` | Yellow dot |
| `.status-dot--danger` | Red dot |
| `.status` | Container with dot and text |

#### Utilities

| Class | Purpose |
|-------|---------|
| `.loading` | Loading state text |
| `.empty` | Empty state text |
| `.meta` | Secondary/date text |
| `.title` | Bold title with link styling |
| `.untitled` | Italic placeholder text |
| `.mono` | Monospace text |
| `.hidden` | Hide element |
| `.flex-between` | Flex with space-between |
| `.flex-row` | Flex row with gap |
| `.flex-col` | Flex column with gap |
| `.text-center` | Center text |
| `.grid` | Grid with gap |
| `.grid--auto` | Auto-fit grid columns |

### Web Component Styles (web-components.css)

These classes are used inside Shadow DOM via `<link rel="stylesheet" href="/styles/web-components.css">`:

| Class | Component | Purpose |
|-------|-----------|---------|
| `.icon-btn` | gp-theme-toggle, gp-footer | 36x36 bordered icon button |
| `.nav-link` | gp-header | Navigation link with hover |
| `.logo` | gp-header | Logo link with icon |
| `.footer-links` | gp-footer | Social links container |
| `.copyright` | gp-footer | Copyright text |

### Page Layout Classes (base.css)

Add `class="page"` to `<body>` for pages with header and footer:
- Sets `display: flex; flex-direction: column`
- Footer sticks to bottom on short content

```html
<body class="page">
  <gp-header></gp-header>
  <main class="container">...</main>
  <gp-footer></gp-footer>
</body>
```

### Container Classes (base.css)

| Class | Max Width | Use For |
|-------|-----------|---------|
| `.container` | 768px | Prose content |
| `.container--wide` | 1024px | Full layouts |

---

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

### Backend Architecture

The backend is organized into modular, testable components:

**Data Access Objects (`src/dao/`)**
Each entity has its own DAO file with CRUD operations:
- `draft.dao.ts`: Draft operations + sharing (`getDraft`, `listDrafts`, `createDraft`, `updateDraft`, `deleteDraft`, `createShareToken`, `getDraftByShareToken`)
- `post.dao.ts`: Post operations + publishing (`getPost`, `getPostBySlug`, `listPosts`, `updatePost`, `deletePost`, `publishDraft`, `unpublishPost`)
- `tracking.dao.ts`: Tracking operations + events (`getTrackingSlug`, `listTrackingSlugs`, `createTrackingSlug`, `deleteTrackingSlug`, `recordTrackingEvent`)
- `session.dao.ts`: Session operations (`createSession`, `getSession`, `deleteSession`)
- `photo.dao.ts`: Photo operations (`getPhoto`, `listPhotos`, `createPhoto`, `updatePhoto`, `deletePhoto`)
- `project.dao.ts`: Project operations + reorder (`getProject`, `listProjects`, `createProject`, `updateProject`, `deleteProject`, `reorderProjects`)
- `base.ts`: Shared index management (`getIndex`, `addToIndex`, `removeFromIndex`)

**Handlers (`src/handlers/`)**
Request handlers are split by route type:
- `api/public.ts`: Public API endpoints
- `api/auth.ts`: Authentication endpoints
- `api/drafts.ts`: Admin draft endpoints
- `api/posts.ts`: Admin post endpoints
- `api/tracking.ts`: Admin tracking endpoints
- `api/photos.ts`: Photo endpoints (public and admin)
- `api/projects.ts`: Project endpoints (public and admin) with reorder
- `pages/*.ts`: Page rendering handlers

**Templates (`src/templates/`)**
HTML templates for server-rendered pages:
- `post.ts`: Blog post and draft preview pages
- `tracking-redirect.ts`: Tracking redirect page

**Utilities (`src/lib/`)**
Shared utility functions:
- `utils.ts`: `escapeHtml`, `escapeJs`, `formatDate`, `getExcerpt`, `slugify`, `generateRandomSlug`
- `response.ts`: `jsonResponse`, `htmlResponse`, `corsHeaders`
- `markdown.ts`: Custom markdown renderer
- `exif.ts`: EXIF stripping for JPEG images (`isJpeg`, `stripExif`)

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
- **Editor** (`/admin/editor`): Split-pane markdown editor with live preview, toolbar, keyboard shortcuts (Ctrl+S, Ctrl+B, Ctrl+I), auto-generated slugs, optional description field for blog listing
- **Posts** (`/admin/posts`): List published posts with edit/unpublish/delete actions
- **Drafts** (`/admin/drafts`): List drafts with edit/share/publish/delete actions
- **Photos** (`/admin/photos`): Grid-based photo management with upload (EXIF stripped), edit metadata, and delete. First item is "+" upload button.
- **Tracking** (`/admin/tracking`): Create/manage tracking links, view event timelines

### Client-side Markdown Renderer (`public/lib/markdown.js`)
- Mirrors server-side renderer for consistent preview
- Used in editor for live preview
- Supports same macro syntax as server

### Testing (`src/__tests__/`)
- Uses Vitest with `@cloudflare/vitest-pool-workers` for Workers-compatible testing
- Tests run in the actual Workers runtime environment
- Router tests verify request dispatch to correct handlers
- Handlers can be mocked to test routing logic in isolation

## Next Steps

1. Add Analytics Engine integration for page views
2. Add drag-and-drop file upload UI in editor
3. Add auto-save for drafts in editor
4. SEO meta tags for blog posts
5. Add actual project URLs/iframes to home page shelf
6. Add profile image to about page

---

## Contribution Guidelines

**IMPORTANT:** Every contribution to this repository MUST update this CLAUDE.md file to reflect the current state of the project. This includes:

- Adding newly implemented features to the "Implemented" checklist
- Removing completed items from "Not Yet Implemented"
- Updating the "File Structure" section when new files are added
- Documenting any new patterns, conventions, or design decisions
- Keeping "Next Steps" current

This ensures CLAUDE.md remains an accurate representation of what exists in the codebase right now, as distinct from DESIGN.md which represents the end goal.
