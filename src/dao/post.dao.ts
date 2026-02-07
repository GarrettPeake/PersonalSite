/**
 * Post Data Access Object
 *
 * Manages published blog posts with slug-based lookups.
 */

import { KV_PREFIX } from '../types';
import { getIndex, addToIndex, removeFromIndex } from './base';
import { getDraft, deleteDraft, createDraft, type Draft } from './draft.dao';

// ============================================================================
// Types
// ============================================================================

export interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  description?: string;
  publishedAt: string;
  updatedAt: string;
}

export type UpdatePostInput = Partial<Omit<Post, 'id' | 'publishedAt'>>;

// ============================================================================
// Post CRUD Operations
// ============================================================================

/**
 * Get a post by ID
 */
export async function getPost(kv: KVNamespace, id: string): Promise<Post | null> {
  const data = await kv.get(`${KV_PREFIX.POST}${id}`);
  if (!data) return null;
  return JSON.parse(data);
}

/**
 * Get a post by its URL slug
 */
export async function getPostBySlug(kv: KVNamespace, slug: string): Promise<Post | null> {
  const id = await kv.get(`${KV_PREFIX.POST_SLUG}${slug}`);
  if (!id) return null;
  return getPost(kv, id);
}

/**
 * List all posts (newest first)
 */
export async function listPosts(kv: KVNamespace): Promise<Post[]> {
  const ids = await getIndex(kv, KV_PREFIX.INDEX_POSTS);
  const results = await Promise.all(ids.map(id => getPost(kv, id)));
  return results.filter((post): post is Post => post !== null);
}

/**
 * Update an existing post
 */
export async function updatePost(
  kv: KVNamespace,
  id: string,
  data: UpdatePostInput
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

/**
 * Delete a post
 */
export async function deletePost(kv: KVNamespace, id: string): Promise<boolean> {
  const post = await getPost(kv, id);
  if (!post) return false;

  await kv.delete(`${KV_PREFIX.POST}${id}`);
  await kv.delete(`${KV_PREFIX.POST_SLUG}${post.slug}`);
  await removeFromIndex(kv, KV_PREFIX.INDEX_POSTS, id);

  return true;
}

// ============================================================================
// Publish/Unpublish Operations
// ============================================================================

/**
 * Publish a draft as a post
 */
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
    description: draft.description,
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

/**
 * Unpublish a post back to a draft
 */
export async function unpublishPost(kv: KVNamespace, postId: string): Promise<Draft> {
  const post = await getPost(kv, postId);
  if (!post) throw new Error('Post not found');

  // Create draft from post
  const draft = await createDraft(kv, {
    title: post.title,
    slug: post.slug,
    content: post.content,
    description: post.description,
  });

  // Delete the post
  await deletePost(kv, postId);

  return draft;
}
