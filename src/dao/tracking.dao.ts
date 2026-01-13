/**
 * Tracking Data Access Object
 *
 * Manages tracking slugs for link tracking and analytics.
 */

import { KV_PREFIX } from '../types';
import { getIndex, addToIndex, removeFromIndex } from './base';
import { generateRandomSlug } from '../lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface TrackingSlug {
  slug: string;
  tag: string;
  createdAt: string;
  events: TrackingEvent[];
}

export interface TrackingEvent {
  timestamp: string;
  page: string;
  referrer?: string;
  userAgent?: string;
}

// ============================================================================
// Tracking CRUD Operations
// ============================================================================

/**
 * Get a tracking slug with its events
 */
export async function getTrackingSlug(
  kv: KVNamespace,
  slug: string
): Promise<TrackingSlug | null> {
  const data = await kv.get(`${KV_PREFIX.TRACKING}${slug}`);
  if (!data) return null;
  return JSON.parse(data);
}

/**
 * List all tracking slugs
 */
export async function listTrackingSlugs(kv: KVNamespace): Promise<TrackingSlug[]> {
  const slugs = await getIndex(kv, KV_PREFIX.INDEX_TRACKING);
  const results: TrackingSlug[] = [];

  for (const slug of slugs) {
    const tracking = await getTrackingSlug(kv, slug);
    if (tracking) results.push(tracking);
  }

  return results;
}

/**
 * Create a new tracking slug
 */
export async function createTrackingSlug(
  kv: KVNamespace,
  tag: string,
  customSlug?: string
): Promise<TrackingSlug> {
  // Generate or use custom slug
  const slug = customSlug || generateRandomSlug(5);

  // Validate slug
  if (!/^[a-zA-Z0-9]{2,10}$/.test(slug)) {
    throw new Error('Slug must be 2-10 alphanumeric characters');
  }

  // Check if slug exists
  const existing = await getTrackingSlug(kv, slug);
  if (existing) {
    throw new Error(`Slug "${slug}" already exists`);
  }

  const tracking: TrackingSlug = {
    slug,
    tag,
    createdAt: new Date().toISOString(),
    events: [],
  };

  await kv.put(`${KV_PREFIX.TRACKING}${slug}`, JSON.stringify(tracking));
  await addToIndex(kv, KV_PREFIX.INDEX_TRACKING, slug);

  return tracking;
}

/**
 * Delete a tracking slug
 */
export async function deleteTrackingSlug(kv: KVNamespace, slug: string): Promise<boolean> {
  const tracking = await getTrackingSlug(kv, slug);
  if (!tracking) return false;

  await kv.delete(`${KV_PREFIX.TRACKING}${slug}`);
  await removeFromIndex(kv, KV_PREFIX.INDEX_TRACKING, slug);

  return true;
}

// ============================================================================
// Event Recording
// ============================================================================

/**
 * Record a tracking event
 */
export async function recordTrackingEvent(
  kv: KVNamespace,
  slug: string,
  event: Omit<TrackingEvent, 'timestamp'>
): Promise<TrackingSlug | null> {
  const tracking = await getTrackingSlug(kv, slug);
  if (!tracking) return null;

  const newEvent: TrackingEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  tracking.events.push(newEvent);

  await kv.put(`${KV_PREFIX.TRACKING}${slug}`, JSON.stringify(tracking));
  return tracking;
}
