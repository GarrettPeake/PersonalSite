/**
 * Session Data Access Object
 *
 * Manages authentication sessions stored in KV with TTL-based expiration.
 */

import { KV_KEY } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface Session {
  token: string;
  expiresAt: string;
}

// ============================================================================
// Session Operations
// ============================================================================

/**
 * Create a new session with TTL
 */
export async function createSession(
  kv: KVNamespace,
  ttlSeconds: number = 86400
): Promise<Session> {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  const session: Session = { token, expiresAt };

  // Store with TTL so it auto-expires
  await kv.put(`${KV_KEY.SESSION}${token}`, JSON.stringify(session), {
    expirationTtl: ttlSeconds,
  });

  return session;
}

/**
 * Get a session by token, returns null if expired or not found
 */
export async function getSession(kv: KVNamespace, token: string): Promise<Session | null> {
  const data = await kv.get(`${KV_KEY.SESSION}${token}`);
  if (!data) return null;

  const session: Session = JSON.parse(data);

  // Double-check expiration (belt and suspenders with KV TTL)
  if (new Date(session.expiresAt) < new Date()) {
    await deleteSession(kv, token);
    return null;
  }

  return session;
}

/**
 * Delete a session
 */
export async function deleteSession(kv: KVNamespace, token: string): Promise<void> {
  await kv.delete(`${KV_KEY.SESSION}${token}`);
}
