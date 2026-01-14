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
  SITE_URL: string;

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
  INDEX_DRAFTS: 'index:drafts',
  INDEX_POSTS: 'index:posts',
  INDEX_TRACKING: 'index:tracking',
  INDEX_PHOTOS: 'index:photos',
} as const;

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
export type PhotoUpdateInput = Pick<Photo, 'location' | 'description'>;
