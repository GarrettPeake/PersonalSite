/**
 * Environment bindings available to the Worker
 */
export interface Env {
  // KV Namespace (rate limiting)
  KV: KVNamespace;

  // D1 Database for all structured data
  DB: D1Database;

  // R2 Bucket for file uploads
  R2: R2Bucket;

  // Analytics Engine for page view tracking
  ANALYTICS: AnalyticsEngineDataset;

  // Static assets binding
  ASSETS: Fetcher;

  // Environment variables
  /** Where the admin lives (its sessions and GAuth registration), e.g. https://gpeake.com. */
  APP_ORIGIN: string;
  /** GAuth, the passkey sign-in (src/auth/gauth.ts). */
  GAUTH_ORIGIN: string;
  /** GAuth's signing certificate(s), PEM; public. List old and new during a key rotation. */
  GAUTH_CERTS: string;

  // Secrets (set via wrangler secret put)
  BETTER_AUTH_SECRET: string;
}

// ============================================================================
// Page Content Types
// ============================================================================

/**
 * Generic page content stored in KV
 */
export interface PageContent {
  content: string;
  updatedAt: string;
}

// ============================================================================
// Photo Types
// ============================================================================

/**
 * Photo entity stored in KV
 */
export interface Photo {
  id: string;
  url: string;           // R2 URL (files.gpeake.com/...)
  filename: string;      // Filename in R2
  location: string;      // Location name
  description: string;   // Photo description
  publishedAt: string;   // ISO timestamp
  updatedAt: string;     // ISO timestamp
}

/**
 * Input for creating a new photo
 */
export type PhotoCreateInput = Omit<Photo, 'id' | 'publishedAt' | 'updatedAt'>;

/**
 * Input for updating photo metadata
 */
export type PhotoUpdateInput = Pick<Photo, 'location' | 'description' | 'publishedAt'>;

// ============================================================================
// Project Types
// ============================================================================

/**
 * Content piece within a project (image or iframe)
 */
export interface ContentPiece {
  id: string;
  type: 'image' | 'iframe';
  url: string;           // R2 URL for images, external URL for iframes
  description: string;   // Markdown-formatted caption
  order: number;         // Order within project
}

/**
 * Project entity stored in KV
 */
export interface Project {
  id: string;
  title: string;
  icon: string;              // SVG string OR R2 image URL
  iconType: 'svg' | 'image'; // Determines how to render
  iconAlt?: string;          // Alt text for icon image (accessibility)
  description: string;       // Markdown-formatted
  contentPieces: ContentPiece[];
  order: number;             // For custom ordering on home page
  createdAt: string;         // ISO timestamp
  updatedAt: string;         // ISO timestamp
}

/**
 * Input for creating a new project
 */
export type ProjectCreateInput = Omit<Project, 'id' | 'order' | 'createdAt' | 'updatedAt'>;

/**
 * Input for updating a project
 */
export type ProjectUpdateInput = Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>;
