/**
 * Draft Data Access Object
 *
 * Manages draft blog posts and their share tokens.
 */

import { KV_PREFIX } from '../types';
import { getIndex, addToIndex, removeFromIndex } from './base';

// ============================================================================
// Types
// ============================================================================

export interface Draft {
  id: string;
  title: string;
  slug: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  shareToken?: string;
}

export type CreateDraftInput = Omit<Draft, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateDraftInput = Partial<Omit<Draft, 'id' | 'createdAt'>>;

// ============================================================================
// Draft CRUD Operations
// ============================================================================

/**
 * Get a draft by ID
 */
export async function getDraft(kv: KVNamespace, id: string): Promise<Draft | null> {
  const data = await kv.get(`${KV_PREFIX.DRAFT}${id}`);
  if (!data) return null;
  return JSON.parse(data);
}

/**
 * List all drafts (newest first)
 */
export async function listDrafts(kv: KVNamespace): Promise<Draft[]> {
  const ids = await getIndex(kv, KV_PREFIX.INDEX_DRAFTS);
  const drafts: Draft[] = [];

  for (const id of ids) {
    const draft = await getDraft(kv, id);
    if (draft) drafts.push(draft);
  }

  return drafts;
}

/**
 * Create a new draft
 */
export async function createDraft(kv: KVNamespace, data: CreateDraftInput): Promise<Draft> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const draft: Draft = {
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  };

  await kv.put(`${KV_PREFIX.DRAFT}${id}`, JSON.stringify(draft));
  await addToIndex(kv, KV_PREFIX.INDEX_DRAFTS, id);

  return draft;
}

/**
 * Update an existing draft
 */
export async function updateDraft(
  kv: KVNamespace,
  id: string,
  data: UpdateDraftInput
): Promise<Draft | null> {
  const existing = await getDraft(kv, id);
  if (!existing) return null;

  const updated: Draft = {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  };

  await kv.put(`${KV_PREFIX.DRAFT}${id}`, JSON.stringify(updated));
  return updated;
}

/**
 * Delete a draft and its share token
 */
export async function deleteDraft(kv: KVNamespace, id: string): Promise<boolean> {
  const draft = await getDraft(kv, id);
  if (!draft) return false;

  // Remove share token lookup if exists
  if (draft.shareToken) {
    await kv.delete(`${KV_PREFIX.SHARE}${draft.shareToken}`);
  }

  await kv.delete(`${KV_PREFIX.DRAFT}${id}`);
  await removeFromIndex(kv, KV_PREFIX.INDEX_DRAFTS, id);

  return true;
}

// ============================================================================
// Draft Sharing Operations
// ============================================================================

/**
 * Create a shareable link token for a draft
 */
export async function createShareToken(kv: KVNamespace, draftId: string): Promise<string> {
  const draft = await getDraft(kv, draftId);
  if (!draft) throw new Error('Draft not found');

  // Remove old share token if exists
  if (draft.shareToken) {
    await kv.delete(`${KV_PREFIX.SHARE}${draft.shareToken}`);
  }

  // Create new token
  const token = crypto.randomUUID();
  await kv.put(`${KV_PREFIX.SHARE}${token}`, draftId);
  await updateDraft(kv, draftId, { shareToken: token });

  return token;
}

/**
 * Get a draft by its share token
 */
export async function getDraftByShareToken(kv: KVNamespace, token: string): Promise<Draft | null> {
  const draftId = await kv.get(`${KV_PREFIX.SHARE}${token}`);
  if (!draftId) return null;
  return getDraft(kv, draftId);
}

/**
 * Revoke a draft's share token
 */
export async function revokeShareToken(kv: KVNamespace, draftId: string): Promise<void> {
  const draft = await getDraft(kv, draftId);
  if (!draft?.shareToken) return;

  await kv.delete(`${KV_PREFIX.SHARE}${draft.shareToken}`);
  await updateDraft(kv, draftId, { shareToken: undefined });
}
