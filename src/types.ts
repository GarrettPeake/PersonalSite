/**
 * Environment bindings available to the Worker
 */
export interface Env {
  // KV Namespace for all data storage (single-table design)
  KV: KVNamespace;

  // R2 Bucket for file uploads
  R2: R2Bucket;

  // Analytics Engine for page view tracking
  ANALYTICS: AnalyticsEngineDataset;

  // Static assets binding
  ASSETS: Fetcher;

  // Environment variables

  // Secrets (set via wrangler secret put)
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD_HASH: string;
  SESSION_SECRET: string;
}

/**
 * KV key prefixes for single-table design
 */
export const KV_PREFIX = {
  DRAFT: 'draft:',
  POST: 'post:',
  POST_SLUG: 'post-slug:',
  SHARE: 'share:',
  SESSION: 'session:',
  TRACKING: 'tracking:',
  PHOTO: 'photo:',
  PROJECT: 'project:',
  INDEX_DRAFTS: 'index:drafts',
  INDEX_POSTS: 'index:posts',
  INDEX_TRACKING: 'index:tracking',
  INDEX_PHOTOS: 'index:photos',
  INDEX_PROJECTS: 'index:projects',
  PAGE_ABOUT: 'page:about',
} as const;

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
