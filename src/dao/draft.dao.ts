/**
 * Draft Data Access Object
 *
 * Manages draft blog posts and their share tokens using D1.
 */

import { queryOne, queryAll, execute } from './base';

// ============================================================================
// Types
// ============================================================================

export interface Draft {
  id: string;
  title: string;
  slug: string;
  content: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  shareToken?: string;
}

export type CreateDraftInput = Omit<Draft, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateDraftInput = Partial<Omit<Draft, 'id' | 'createdAt'>>;

// ============================================================================
// SQL Column Lists
// ============================================================================

const DRAFT_COLUMNS = 'id, title, slug, content, description, share_token as shareToken, created_at as createdAt, updated_at as updatedAt';
const DRAFT_SUMMARY_COLUMNS = 'id, title, slug, description, share_token as shareToken, created_at as createdAt, updated_at as updatedAt';

// ============================================================================
// Draft CRUD Operations
// ============================================================================

/**
 * Get a draft by ID
 */
export async function getDraft(db: D1Database, id: string): Promise<Draft | null> {
  return queryOne<Draft>(db, `SELECT ${DRAFT_COLUMNS} FROM drafts WHERE id = ?`, [id]);
}

/**
 * List all drafts (newest first), without content field
 */
export async function listDrafts(db: D1Database): Promise<Omit<Draft, 'content'>[]> {
  return queryAll<Omit<Draft, 'content'>>(
    db,
    `SELECT ${DRAFT_SUMMARY_COLUMNS} FROM drafts ORDER BY updated_at DESC`
  );
}

/**
 * Create a new draft
 */
export async function createDraft(db: D1Database, data: CreateDraftInput): Promise<Draft> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const draft: Draft = {
    id,
    title: data.title,
    slug: data.slug,
    content: data.content ?? '',
    description: data.description,
    shareToken: data.shareToken,
    createdAt: now,
    updatedAt: now,
  };

  await execute(
    db,
    'INSERT INTO drafts (id, title, slug, content, description, share_token, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [draft.id, draft.title, draft.slug, draft.content, draft.description ?? null, draft.shareToken ?? null, draft.createdAt, draft.updatedAt]
  );

  return draft;
}

/**
 * Update an existing draft
 */
export async function updateDraft(
  db: D1Database,
  id: string,
  data: UpdateDraftInput
): Promise<Draft | null> {
  const existing = await getDraft(db, id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updated: Draft = {
    ...existing,
    ...data,
    updatedAt: now,
  };

  await execute(
    db,
    'UPDATE drafts SET title = ?, slug = ?, content = ?, description = ?, share_token = ?, updated_at = ? WHERE id = ?',
    [updated.title, updated.slug, updated.content, updated.description ?? null, updated.shareToken ?? null, updated.updatedAt, id]
  );

  return updated;
}

/**
 * Delete a draft
 */
export async function deleteDraft(db: D1Database, id: string): Promise<boolean> {
  const existing = await getDraft(db, id);
  if (!existing) return false;

  await execute(db, 'DELETE FROM drafts WHERE id = ?', [id]);
  return true;
}

// ============================================================================
// Draft Sharing Operations
// ============================================================================

/**
 * Create a shareable link token for a draft
 */
export async function createShareToken(db: D1Database, draftId: string): Promise<string> {
  const draft = await getDraft(db, draftId);
  if (!draft) throw new Error('Draft not found');

  const token = crypto.randomUUID();
  await execute(
    db,
    'UPDATE drafts SET share_token = ? WHERE id = ?',
    [token, draftId]
  );

  return token;
}

/**
 * Get a draft by its share token
 */
export async function getDraftByShareToken(db: D1Database, token: string): Promise<Draft | null> {
  return queryOne<Draft>(db, `SELECT ${DRAFT_COLUMNS} FROM drafts WHERE share_token = ?`, [token]);
}

/**
 * Revoke a draft's share token
 */
export async function revokeShareToken(db: D1Database, draftId: string): Promise<void> {
  await execute(
    db,
    'UPDATE drafts SET share_token = NULL WHERE id = ?',
    [draftId]
  );
}
