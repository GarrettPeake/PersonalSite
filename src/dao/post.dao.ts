/**
 * Post Data Access Object
 *
 * Manages published blog posts with slug-based lookups using D1.
 */

import { queryOne, queryAll, execute } from './base';
import type { Draft } from './draft.dao';

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

export type UpdatePostInput = Partial<Omit<Post, 'id'>>;

// ============================================================================
// SQL Column Lists
// ============================================================================

const POST_COLUMNS = 'id, title, slug, content, description, published_at as publishedAt, updated_at as updatedAt';
const POST_SUMMARY_COLUMNS = 'id, title, slug, description, published_at as publishedAt, updated_at as updatedAt';

// ============================================================================
// Post CRUD Operations
// ============================================================================

/**
 * Get a post by ID
 */
export async function getPost(db: D1Database, id: string): Promise<Post | null> {
  return queryOne<Post>(db, `SELECT ${POST_COLUMNS} FROM posts WHERE id = ?`, [id]);
}

/**
 * Get a post by its URL slug
 */
export async function getPostBySlug(db: D1Database, slug: string): Promise<Post | null> {
  return queryOne<Post>(db, `SELECT ${POST_COLUMNS} FROM posts WHERE slug = ?`, [slug]);
}

/**
 * List all posts (newest first), without content field
 */
export async function listPosts(db: D1Database): Promise<Omit<Post, 'content'>[]> {
  return queryAll<Omit<Post, 'content'>>(
    db,
    `SELECT ${POST_SUMMARY_COLUMNS} FROM posts ORDER BY published_at DESC`
  );
}

/**
 * Update an existing post
 */
export async function updatePost(
  db: D1Database,
  id: string,
  data: UpdatePostInput
): Promise<Post | null> {
  const existing = await getPost(db, id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updated: Post = {
    ...existing,
    ...data,
    updatedAt: now,
  };

  try {
    await execute(
      db,
      'UPDATE posts SET title = ?, slug = ?, content = ?, description = ?, published_at = ?, updated_at = ? WHERE id = ?',
      [updated.title, updated.slug, updated.content, updated.description ?? null, updated.publishedAt, updated.updatedAt, id]
    );
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes('UNIQUE constraint failed') && msg.includes('slug')) {
      throw new Error(`Slug "${data.slug}" is already in use`);
    }
    throw e;
  }

  return updated;
}

/**
 * Delete a post
 */
export async function deletePost(db: D1Database, id: string): Promise<boolean> {
  const existing = await getPost(db, id);
  if (!existing) return false;

  await execute(db, 'DELETE FROM posts WHERE id = ?', [id]);
  return true;
}

// ============================================================================
// Publish/Unpublish Operations
// ============================================================================

/**
 * Publish a draft as a post
 *
 * Reads the draft directly from D1, creates a post, and removes the draft atomically.
 */
export async function publishDraft(db: D1Database, draftId: string): Promise<Post> {
  const draft = await queryOne<Draft>(
    db,
    'SELECT id, title, slug, content, description, share_token as shareToken, created_at as createdAt, updated_at as updatedAt FROM drafts WHERE id = ?',
    [draftId]
  );
  if (!draft) throw new Error('Draft not found');

  // Check if slug is already taken
  const existingPost = await getPostBySlug(db, draft.slug);
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

  // Atomic batch: insert post + delete draft
  await db.batch([
    db.prepare(
      'INSERT INTO posts (id, title, slug, content, description, published_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(post.id, post.title, post.slug, post.content, post.description ?? null, post.publishedAt, post.updatedAt),
    db.prepare('DELETE FROM drafts WHERE id = ?').bind(draftId),
  ]);

  return post;
}

/**
 * Unpublish a post back to a draft
 *
 * Reads the post, creates a draft, and removes the post atomically.
 */
export async function unpublishPost(db: D1Database, postId: string): Promise<Draft> {
  const post = await getPost(db, postId);
  if (!post) throw new Error('Post not found');

  const draftId = crypto.randomUUID();
  const now = new Date().toISOString();

  const draft: Draft = {
    id: draftId,
    title: post.title,
    slug: post.slug,
    content: post.content,
    description: post.description,
    createdAt: now,
    updatedAt: now,
  };

  // Atomic batch: insert draft + delete post
  await db.batch([
    db.prepare(
      'INSERT INTO drafts (id, title, slug, content, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(draft.id, draft.title, draft.slug, draft.content, draft.description ?? null, draft.createdAt, draft.updatedAt),
    db.prepare('DELETE FROM posts WHERE id = ?').bind(postId),
  ]);

  return draft;
}
