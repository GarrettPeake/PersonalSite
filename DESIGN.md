# Garrett Peake Personal Website - Design Document

## Overview

A personal website built on Cloudflare Workers with a neo-brutalist aesthetic, featuring a portfolio, blog, and admin CRM with a macro-enriched markdown editor.

**Tech Stack:**
- Frontend: Vanilla HTML, CSS, JS with Web Components (no build step)
- Backend: Cloudflare Workers (TypeScript)
- Storage: Cloudflare KV (content) + D1 (structured data)

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
- Quick stats: draft count, post count
- Recent drafts list
- Recent posts list
- Quick actions: New Draft, View Site

#### 3. Drafts List (`/admin/drafts`)
- Table/list of all drafts
- Columns: title, created, modified, actions
- Actions: Edit, Preview, Publish, Share Link, Delete

#### 4. Posts List (`/admin/posts`)
- Table/list of all published posts
- Columns: title, slug, published date, actions
- Actions: Edit, Unpublish (to draft), Delete

#### 5. Editor (`/admin/editor/:id?`)
- WYSIWYG markdown editor with live preview
- Split pane: editor left, preview right
- Toolbar for common formatting + macro insertion
- Auto-save drafts
- Fields: title, slug (auto-generated, editable), content
- Actions: Save Draft, Preview, Publish

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
  renderedHtml: string; // Pre-rendered HTML (cached)
  publishedAt: string;
  updatedAt: string;
}

interface Session {
  token: string;
  expiresAt: string;
}
```

### API Endpoints

#### Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/posts` | List published posts (paginated) |
| GET | `/api/posts/:slug` | Get single post by slug |
| GET | `/api/draft/share/:token` | Get draft by share token |

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

### Storage Strategy

**Cloudflare D1 (SQLite):**
- Drafts table
- Posts table
- Sessions table

**Cloudflare KV:**
- Rendered HTML cache (key: `post:${slug}`)
- Share tokens lookup (key: `share:${token}` → draft ID)

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
      gp-editor.js       # Markdown editor
      gp-preview.js      # Live preview pane
      gp-draft-list.js   # Drafts table
      gp-post-list.js    # Posts table
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
│   │   └── macros.ts       # Macro parser & renderer
│   ├── /middleware
│   │   └── auth.ts         # Auth middleware
│   └── /utils
│       └── markdown.ts     # Markdown processing
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
│   │       └── editor.html
│   └── /assets
│       ├── favicon.svg     # Peak favicon
│       └── /images
└── /migrations
    └── 0001_initial.sql    # D1 schema
```

---

## Implementation Phases

### Phase 1: Foundation
- [ ] Cloudflare Workers project setup
- [ ] D1 database schema
- [ ] Basic routing
- [ ] Theme CSS + base styles
- [ ] Core web components (header, footer, theme toggle)

### Phase 2: Public Site
- [ ] Home/portfolio page
- [ ] Blog listing page
- [ ] Single post page
- [ ] About page
- [ ] Post API endpoints

### Phase 3: Admin CRM
- [ ] Authentication system
- [ ] Admin dashboard
- [ ] Drafts CRUD + UI
- [ ] Posts CRUD + UI
- [ ] Share link functionality

### Phase 4: Editor & Macros
- [ ] Markdown editor component
- [ ] Live preview component
- [ ] Macro parser
- [ ] Individual macro components
- [ ] WYSIWYG toolbar

### Phase 5: Polish
- [ ] Mobile responsiveness
- [ ] Performance optimization
- [ ] SEO meta tags
- [ ] Error pages
- [ ] Rate limiting

---

## Open Questions

1. **Editor Library:** Build custom or use existing (e.g., CodeMirror, Monaco)?
2. **Markdown Parser:** marked.js, markdown-it, or custom?
3. **Image Hosting:** Cloudflare Images, R2, or external (imgur, etc.)?
4. **Analytics:** Cloudflare Web Analytics or none?
5. **Comments:** Future consideration or out of scope?
