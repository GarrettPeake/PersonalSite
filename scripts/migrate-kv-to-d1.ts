#!/usr/bin/env npx tsx

/**
 * KV -> D1 Migration Script
 *
 * Reads all data from the existing KV namespace and writes it to the D1 database.
 * Uses wrangler CLI commands for both KV reads and D1 writes.
 *
 * Usage: npx tsx scripts/migrate-kv-to-d1.ts
 *
 * The script is idempotent — uses INSERT OR IGNORE so re-running is safe.
 */

import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const KV_NAMESPACE_ID = '255ea6f6b3514decb5483765d99cf66a';
const D1_DATABASE = 'personal-site';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function kvGet(key: string): string | null {
  try {
    const result = execSync(
      `npx wrangler kv key get "${key}" --namespace-id=${KV_NAMESPACE_ID} --remote --text`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
    );
    const trimmed = result.trim();
    if (trimmed === 'Value not found') return null;
    return trimmed;
  } catch {
    return null;
  }
}

/**
 * Escape a value for use inside a SQLite string literal.
 * SQLite only requires doubling single quotes inside '...' literals.
 */
function sqlEscape(value: string | null | undefined): string {
  if (value === null || value === undefined) return 'NULL';
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Write SQL to a temp file and execute it via wrangler d1 execute --file.
 * This avoids all shell-escaping issues with --command.
 */
function d1ExecuteSQL(sql: string): void {
  const tmpFile = join(tmpdir(), `migrate-${Date.now()}-${Math.random().toString(36).slice(2)}.sql`);
  writeFileSync(tmpFile, sql, 'utf-8');
  try {
    execSync(`npx wrangler d1 execute ${D1_DATABASE} --remote --file="${tmpFile}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } finally {
    try { unlinkSync(tmpFile); } catch { /* ignore cleanup errors */ }
  }
}

/**
 * Execute a simple SQL command (no special characters expected in output).
 * Returns raw stdout which may contain JSON if --json is used.
 */
function d1Query(sql: string): string {
  return execSync(
    `npx wrangler d1 execute ${D1_DATABASE} --remote --command="${sql}" --json`,
    { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
  );
}

// ---------------------------------------------------------------------------
// Entity migrations
// ---------------------------------------------------------------------------

function migratePosts(): void {
  console.log('--- Posts ---');
  const indexRaw = kvGet('index:posts');
  if (!indexRaw) {
    console.log('  No posts found in KV.');
    return;
  }

  const ids: string[] = JSON.parse(indexRaw);
  console.log(`  Found ${ids.length} post(s) in index.`);

  for (const id of ids) {
    const raw = kvGet(`post:${id}`);
    if (!raw) {
      console.warn(`  ! Post ${id} not found in KV, skipping.`);
      continue;
    }
    const p = JSON.parse(raw);

    const sql = `INSERT OR IGNORE INTO posts (id, title, slug, content, description, published_at, updated_at)
VALUES (${sqlEscape(p.id)}, ${sqlEscape(p.title)}, ${sqlEscape(p.slug)}, ${sqlEscape(p.content)}, ${sqlEscape(p.description)}, ${sqlEscape(p.publishedAt)}, ${sqlEscape(p.updatedAt)});`;

    d1ExecuteSQL(sql);
    console.log(`  + Post: ${p.title} (${p.slug})`);
  }
}

function migrateDrafts(): void {
  console.log('--- Drafts ---');
  const indexRaw = kvGet('index:drafts');
  if (!indexRaw) {
    console.log('  No drafts found in KV.');
    return;
  }

  const ids: string[] = JSON.parse(indexRaw);
  console.log(`  Found ${ids.length} draft(s) in index.`);

  for (const id of ids) {
    const raw = kvGet(`draft:${id}`);
    if (!raw) {
      console.warn(`  ! Draft ${id} not found in KV, skipping.`);
      continue;
    }
    const d = JSON.parse(raw);

    const sql = `INSERT OR IGNORE INTO drafts (id, title, slug, content, description, share_token, created_at, updated_at)
VALUES (${sqlEscape(d.id)}, ${sqlEscape(d.title)}, ${sqlEscape(d.slug)}, ${sqlEscape(d.content)}, ${sqlEscape(d.description)}, ${sqlEscape(d.shareToken)}, ${sqlEscape(d.createdAt)}, ${sqlEscape(d.updatedAt)});`;

    d1ExecuteSQL(sql);
    console.log(`  + Draft: ${d.title || '(untitled)'} [${d.id}]`);
  }
}

function migratePhotos(): void {
  console.log('--- Photos ---');
  const indexRaw = kvGet('index:photos');
  if (!indexRaw) {
    console.log('  No photos found in KV.');
    return;
  }

  const ids: string[] = JSON.parse(indexRaw);
  console.log(`  Found ${ids.length} photo(s) in index.`);

  for (const id of ids) {
    const raw = kvGet(`photo:${id}`);
    if (!raw) {
      console.warn(`  ! Photo ${id} not found in KV, skipping.`);
      continue;
    }
    const ph = JSON.parse(raw);

    const sql = `INSERT OR IGNORE INTO photos (id, url, filename, location, description, published_at, updated_at)
VALUES (${sqlEscape(ph.id)}, ${sqlEscape(ph.url)}, ${sqlEscape(ph.filename)}, ${sqlEscape(ph.location)}, ${sqlEscape(ph.description)}, ${sqlEscape(ph.publishedAt)}, ${sqlEscape(ph.updatedAt)});`;

    d1ExecuteSQL(sql);
    console.log(`  + Photo: ${ph.filename}`);
  }
}

function migrateProjects(): void {
  console.log('--- Projects ---');
  const indexRaw = kvGet('index:projects');
  if (!indexRaw) {
    console.log('  No projects found in KV.');
    return;
  }

  const ids: string[] = JSON.parse(indexRaw);
  console.log(`  Found ${ids.length} project(s) in index.`);

  for (const id of ids) {
    const raw = kvGet(`project:${id}`);
    if (!raw) {
      console.warn(`  ! Project ${id} not found in KV, skipping.`);
      continue;
    }
    const proj = JSON.parse(raw);

    // Insert the project row
    const projectSQL = `INSERT OR IGNORE INTO projects (id, title, icon, icon_type, icon_alt, description, sort_order, created_at, updated_at)
VALUES (${sqlEscape(proj.id)}, ${sqlEscape(proj.title)}, ${sqlEscape(proj.icon)}, ${sqlEscape(proj.iconType)}, ${sqlEscape(proj.iconAlt)}, ${sqlEscape(proj.description)}, ${proj.order ?? 0}, ${sqlEscape(proj.createdAt)}, ${sqlEscape(proj.updatedAt)});`;

    // Insert content pieces
    const pieces: string[] = [projectSQL];
    if (Array.isArray(proj.contentPieces)) {
      for (const cp of proj.contentPieces) {
        pieces.push(
          `INSERT OR IGNORE INTO content_pieces (id, project_id, type, url, description, sort_order)
VALUES (${sqlEscape(cp.id)}, ${sqlEscape(proj.id)}, ${sqlEscape(cp.type)}, ${sqlEscape(cp.url)}, ${sqlEscape(cp.description)}, ${cp.order ?? 0});`,
        );
      }
    }

    d1ExecuteSQL(pieces.join('\n'));
    const cpCount = proj.contentPieces?.length ?? 0;
    console.log(`  + Project: ${proj.title} (${cpCount} content piece(s))`);
  }
}

function migrateTracking(): void {
  console.log('--- Tracking ---');
  const indexRaw = kvGet('index:tracking');
  if (!indexRaw) {
    console.log('  No tracking slugs found in KV.');
    return;
  }

  const slugs: string[] = JSON.parse(indexRaw);
  console.log(`  Found ${slugs.length} tracking slug(s) in index.`);

  for (const slug of slugs) {
    const raw = kvGet(`tracking:${slug}`);
    if (!raw) {
      console.warn(`  ! Tracking slug "${slug}" not found in KV, skipping.`);
      continue;
    }
    const t = JSON.parse(raw);

    // Insert tracking slug
    const slugSQL = `INSERT OR IGNORE INTO tracking_slugs (slug, tag, created_at)
VALUES (${sqlEscape(t.slug)}, ${sqlEscape(t.tag)}, ${sqlEscape(t.createdAt)});`;

    d1ExecuteSQL(slugSQL);

    // Insert events in batches (wrangler has command size limits)
    const events: Array<{ timestamp: string; page: string; referrer?: string; userAgent?: string }> =
      Array.isArray(t.events) ? t.events : [];

    const BATCH_SIZE = 50;
    for (let i = 0; i < events.length; i += BATCH_SIZE) {
      const batch = events.slice(i, i + BATCH_SIZE);
      const statements = batch.map(
        (ev) =>
          `INSERT INTO tracking_events (slug, timestamp, page, referrer, user_agent)
VALUES (${sqlEscape(t.slug)}, ${sqlEscape(ev.timestamp)}, ${sqlEscape(ev.page)}, ${sqlEscape(ev.referrer)}, ${sqlEscape(ev.userAgent)});`,
      );
      d1ExecuteSQL(statements.join('\n'));
    }

    console.log(`  + Tracking: ${t.slug} (${events.length} event(s))`);
  }
}

function migratePages(): void {
  console.log('--- Pages ---');
  const raw = kvGet('page:about');
  if (!raw) {
    console.log('  No about page found in KV.');
    return;
  }

  const page = JSON.parse(raw);
  const sql = `INSERT OR IGNORE INTO pages (key, content, updated_at)
VALUES (${sqlEscape('about')}, ${sqlEscape(page.content)}, ${sqlEscape(page.updatedAt)});`;

  d1ExecuteSQL(sql);
  console.log('  + Page: about');
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

function verify(): void {
  console.log('\n--- Verification ---');
  try {
    const raw = d1Query(
      `SELECT 'posts' as t, COUNT(*) as c FROM posts UNION ALL SELECT 'drafts', COUNT(*) FROM drafts UNION ALL SELECT 'photos', COUNT(*) FROM photos UNION ALL SELECT 'projects', COUNT(*) FROM projects UNION ALL SELECT 'content_pieces', COUNT(*) FROM content_pieces UNION ALL SELECT 'tracking_slugs', COUNT(*) FROM tracking_slugs UNION ALL SELECT 'tracking_events', COUNT(*) FROM tracking_events UNION ALL SELECT 'pages', COUNT(*) FROM pages`,
    );
    const parsed = JSON.parse(raw);
    // wrangler d1 execute --json returns an array of result sets
    const rows = parsed[0]?.results ?? [];
    for (const row of rows) {
      console.log(`  ${row.t}: ${row.c}`);
    }
  } catch (err) {
    console.warn('  Could not verify counts:', err);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  console.log('=== KV -> D1 Migration ===');
  console.log(`KV Namespace: ${KV_NAMESPACE_ID}`);
  console.log(`D1 Database:  ${D1_DATABASE}`);
  console.log('');

  migratePosts();
  migrateDrafts();
  migratePhotos();
  migrateProjects();
  migrateTracking();
  migratePages();

  verify();

  console.log('\n=== Migration Complete ===');
}

main();
