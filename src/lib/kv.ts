/**
 * KV helper functions for single-table design
 *
 * All data is stored in one KV namespace with prefixed keys.
 * Index arrays are maintained for listing operations.
 */

import { KV_PREFIX } from '../types';

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

export interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  publishedAt: string;
  updatedAt: string;
}

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

export interface Session {
  token: string;
  expiresAt: string;
}

// ============================================================================
// Index Management
// ============================================================================

async function getIndex(kv: KVNamespace, key: string): Promise<string[]> {
  const data = await kv.get(key);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function addToIndex(kv: KVNamespace, key: string, id: string): Promise<void> {
  const index = await getIndex(kv, key);
  if (!index.includes(id)) {
    index.unshift(id); // Add to beginning (newest first)
    await kv.put(key, JSON.stringify(index));
  }
}

async function removeFromIndex(kv: KVNamespace, key: string, id: string): Promise<void> {
  const index = await getIndex(kv, key);
  const filtered = index.filter((item) => item !== id);
  await kv.put(key, JSON.stringify(filtered));
}

// ============================================================================
// Drafts
// ============================================================================

export async function getDraft(kv: KVNamespace, id: string): Promise<Draft | null> {
  const data = await kv.get(`${KV_PREFIX.DRAFT}${id}`);
  if (!data) return null;
  return JSON.parse(data);
}

export async function listDrafts(kv: KVNamespace): Promise<Draft[]> {
  const ids = await getIndex(kv, KV_PREFIX.INDEX_DRAFTS);
  const drafts: Draft[] = [];

  for (const id of ids) {
    const draft = await getDraft(kv, id);
    if (draft) drafts.push(draft);
  }

  return drafts;
}

export async function createDraft(
  kv: KVNamespace,
  data: Omit<Draft, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Draft> {
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

export async function updateDraft(
  kv: KVNamespace,
  id: string,
  data: Partial<Omit<Draft, 'id' | 'createdAt'>>
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
// Draft Sharing
// ============================================================================

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

export async function getDraftByShareToken(kv: KVNamespace, token: string): Promise<Draft | null> {
  const draftId = await kv.get(`${KV_PREFIX.SHARE}${token}`);
  if (!draftId) return null;
  return getDraft(kv, draftId);
}

export async function revokeShareToken(kv: KVNamespace, draftId: string): Promise<void> {
  const draft = await getDraft(kv, draftId);
  if (!draft?.shareToken) return;

  await kv.delete(`${KV_PREFIX.SHARE}${draft.shareToken}`);
  await updateDraft(kv, draftId, { shareToken: undefined });
}

// ============================================================================
// Posts
// ============================================================================

export async function getPost(kv: KVNamespace, id: string): Promise<Post | null> {
  const data = await kv.get(`${KV_PREFIX.POST}${id}`);
  if (!data) return null;
  return JSON.parse(data);
}

export async function getPostBySlug(kv: KVNamespace, slug: string): Promise<Post | null> {
  const id = await kv.get(`${KV_PREFIX.POST_SLUG}${slug}`);
  if (!id) return null;
  return getPost(kv, id);
}

export async function listPosts(kv: KVNamespace): Promise<Post[]> {
  const ids = await getIndex(kv, KV_PREFIX.INDEX_POSTS);
  const posts: Post[] = [];

  for (const id of ids) {
    const post = await getPost(kv, id);
    if (post) posts.push(post);
  }

  return posts;
}

export async function publishDraft(kv: KVNamespace, draftId: string): Promise<Post> {
  const draft = await getDraft(kv, draftId);
  if (!draft) throw new Error('Draft not found');

  // Check if slug is already taken
  const existingPost = await getPostBySlug(kv, draft.slug);
  if (existingPost) {
    throw new Error(`Slug "${draft.slug}" is already in use`);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const post: Post = {
    id,
    title: draft.title,
    slug: draft.slug,
    content: draft.content,
    publishedAt: now,
    updatedAt: now,
  };

  // Save post and create slug lookup
  await kv.put(`${KV_PREFIX.POST}${id}`, JSON.stringify(post));
  await kv.put(`${KV_PREFIX.POST_SLUG}${post.slug}`, id);
  await addToIndex(kv, KV_PREFIX.INDEX_POSTS, id);

  // Delete the draft
  await deleteDraft(kv, draftId);

  return post;
}

export async function updatePost(
  kv: KVNamespace,
  id: string,
  data: Partial<Omit<Post, 'id' | 'publishedAt'>>
): Promise<Post | null> {
  const existing = await getPost(kv, id);
  if (!existing) return null;

  // If slug changed, update slug lookup
  if (data.slug && data.slug !== existing.slug) {
    const slugTaken = await getPostBySlug(kv, data.slug);
    if (slugTaken && slugTaken.id !== id) {
      throw new Error(`Slug "${data.slug}" is already in use`);
    }
    await kv.delete(`${KV_PREFIX.POST_SLUG}${existing.slug}`);
    await kv.put(`${KV_PREFIX.POST_SLUG}${data.slug}`, id);
  }

  const updated: Post = {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  };

  await kv.put(`${KV_PREFIX.POST}${id}`, JSON.stringify(updated));
  return updated;
}

export async function deletePost(kv: KVNamespace, id: string): Promise<boolean> {
  const post = await getPost(kv, id);
  if (!post) return false;

  await kv.delete(`${KV_PREFIX.POST}${id}`);
  await kv.delete(`${KV_PREFIX.POST_SLUG}${post.slug}`);
  await removeFromIndex(kv, KV_PREFIX.INDEX_POSTS, id);

  return true;
}

export async function unpublishPost(kv: KVNamespace, postId: string): Promise<Draft> {
  const post = await getPost(kv, postId);
  if (!post) throw new Error('Post not found');

  // Create draft from post
  const draft = await createDraft(kv, {
    title: post.title,
    slug: post.slug,
    content: post.content,
  });

  // Delete the post
  await deletePost(kv, postId);

  return draft;
}

// ============================================================================
// Tracking
// ============================================================================

export async function getTrackingSlug(kv: KVNamespace, slug: string): Promise<TrackingSlug | null> {
  const data = await kv.get(`${KV_PREFIX.TRACKING}${slug}`);
  if (!data) return null;
  return JSON.parse(data);
}

export async function listTrackingSlugs(kv: KVNamespace): Promise<TrackingSlug[]> {
  const slugs = await getIndex(kv, KV_PREFIX.INDEX_TRACKING);
  const results: TrackingSlug[] = [];

  for (const slug of slugs) {
    const tracking = await getTrackingSlug(kv, slug);
    if (tracking) results.push(tracking);
  }

  return results;
}

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

export async function deleteTrackingSlug(kv: KVNamespace, slug: string): Promise<boolean> {
  const tracking = await getTrackingSlug(kv, slug);
  if (!tracking) return false;

  await kv.delete(`${KV_PREFIX.TRACKING}${slug}`);
  await removeFromIndex(kv, KV_PREFIX.INDEX_TRACKING, slug);

  return true;
}

// ============================================================================
// Sessions
// ============================================================================

export async function createSession(kv: KVNamespace, ttlSeconds: number = 86400): Promise<Session> {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  const session: Session = { token, expiresAt };

  // Store with TTL so it auto-expires
  await kv.put(`${KV_PREFIX.SESSION}${token}`, JSON.stringify(session), {
    expirationTtl: ttlSeconds,
  });

  return session;
}

export async function getSession(kv: KVNamespace, token: string): Promise<Session | null> {
  const data = await kv.get(`${KV_PREFIX.SESSION}${token}`);
  if (!data) return null;

  const session: Session = JSON.parse(data);

  // Double-check expiration (belt and suspenders with KV TTL)
  if (new Date(session.expiresAt) < new Date()) {
    await deleteSession(kv, token);
    return null;
  }

  return session;
}

export async function deleteSession(kv: KVNamespace, token: string): Promise<void> {
  await kv.delete(`${KV_PREFIX.SESSION}${token}`);
}

// ============================================================================
// Utilities
// ============================================================================

function generateRandomSlug(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a URL-friendly slug from a title
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}
