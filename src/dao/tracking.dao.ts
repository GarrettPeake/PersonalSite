/**
 * Tracking Data Access Object
 *
 * Manages tracking slugs for link tracking and analytics using D1.
 */

import { queryOne, queryAll, execute } from './base';
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

/** Summary returned by listTrackingSlugs (events stripped, count included) */
export interface TrackingSlugSummary {
  slug: string;
  tag: string;
  createdAt: string;
  eventCount: number;
}

/** Maximum number of events stored per tracking slug */
const MAX_EVENTS = 10000;

// ============================================================================
// Tracking CRUD Operations
// ============================================================================

/**
 * Get a tracking slug with its events
 */
export async function getTrackingSlug(
  db: D1Database,
  slug: string
): Promise<TrackingSlug | null> {
  const row = await queryOne<{ slug: string; tag: string; createdAt: string }>(
    db,
    'SELECT slug, tag, created_at as createdAt FROM tracking_slugs WHERE slug = ?',
    [slug]
  );
  if (!row) return null;

  const events = await queryAll<TrackingEvent>(
    db,
    'SELECT timestamp, page, referrer, user_agent as userAgent FROM tracking_events WHERE slug = ? ORDER BY timestamp ASC',
    [slug]
  );

  // Strip null values from optional fields to match interface (undefined instead of null)
  const cleanEvents = events.map(e => ({
    timestamp: e.timestamp,
    page: e.page,
    ...(e.referrer != null ? { referrer: e.referrer } : {}),
    ...(e.userAgent != null ? { userAgent: e.userAgent } : {}),
  }));

  return {
    slug: row.slug,
    tag: row.tag,
    createdAt: row.createdAt,
    events: cleanEvents,
  };
}

/**
 * List all tracking slugs (returns summaries without full events array)
 */
export async function listTrackingSlugs(db: D1Database): Promise<TrackingSlugSummary[]> {
  return queryAll<TrackingSlugSummary>(
    db,
    `SELECT ts.slug, ts.tag, ts.created_at as createdAt, COUNT(te.id) as eventCount
     FROM tracking_slugs ts
     LEFT JOIN tracking_events te ON ts.slug = te.slug
     GROUP BY ts.slug
     ORDER BY ts.created_at DESC`
  );
}

/**
 * Create a new tracking slug
 */
export async function createTrackingSlug(
  db: D1Database,
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
  const existing = await queryOne(db, 'SELECT slug FROM tracking_slugs WHERE slug = ?', [slug]);
  if (existing) {
    throw new Error(`Slug "${slug}" already exists`);
  }

  const createdAt = new Date().toISOString();

  await execute(
    db,
    'INSERT INTO tracking_slugs (slug, tag, created_at) VALUES (?, ?, ?)',
    [slug, tag, createdAt]
  );

  return { slug, tag, createdAt, events: [] };
}

/**
 * Delete a tracking slug
 */
export async function deleteTrackingSlug(db: D1Database, slug: string): Promise<boolean> {
  const existing = await queryOne(db, 'SELECT slug FROM tracking_slugs WHERE slug = ?', [slug]);
  if (!existing) return false;

  await execute(db, 'DELETE FROM tracking_slugs WHERE slug = ?', [slug]);
  return true;
}

// ============================================================================
// Event Recording
// ============================================================================

/**
 * Record a tracking event
 */
export async function recordTrackingEvent(
  db: D1Database,
  slug: string,
  event: Omit<TrackingEvent, 'timestamp'>
): Promise<TrackingSlug | null> {
  // Check slug exists
  const existing = await queryOne(db, 'SELECT slug FROM tracking_slugs WHERE slug = ?', [slug]);
  if (!existing) return null;

  const timestamp = new Date().toISOString();

  // Insert the event
  await execute(
    db,
    'INSERT INTO tracking_events (slug, timestamp, page, referrer, user_agent) VALUES (?, ?, ?, ?, ?)',
    [slug, timestamp, event.page, event.referrer ?? null, event.userAgent ?? null]
  );

  // Enforce MAX_EVENTS cap
  const countRow = await queryOne<{ cnt: number }>(
    db,
    'SELECT COUNT(*) as cnt FROM tracking_events WHERE slug = ?',
    [slug]
  );
  const count = countRow?.cnt ?? 0;

  if (count > MAX_EVENTS) {
    const excess = count - MAX_EVENTS;
    await execute(
      db,
      `DELETE FROM tracking_events WHERE id IN (
        SELECT id FROM tracking_events WHERE slug = ? ORDER BY timestamp ASC LIMIT ?
      )`,
      [slug, excess]
    );
  }

  return getTrackingSlug(db, slug);
}
