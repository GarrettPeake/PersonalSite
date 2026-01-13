/**
 * Authentication Middleware
 *
 * Handles admin authentication via session cookies.
 * Uses bcrypt-compatible password verification.
 */

import { Env } from '../types';
import { createSession, getSession, deleteSession } from '../dao/session.dao';

const SESSION_COOKIE = 'gp_session';
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days

/**
 * Verify password against bcrypt hash
 * Simple implementation that works in Workers environment
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // For simplicity, we'll use a basic comparison with Web Crypto
  // In production, you'd want a proper bcrypt implementation
  // This expects hash to be stored as: $simple$<salt>$<hash>

  if (hash.startsWith('$simple$')) {
    const parts = hash.split('$');
    if (parts.length !== 4) return false;

    const salt = parts[2];
    const storedHash = parts[3];

    const encoder = new TextEncoder();
    const data = encoder.encode(salt + password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return computedHash === storedHash;
  }

  // Fallback: direct comparison (for development only)
  return password === hash;
}

/**
 * Generate a password hash for storage
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return `$simple$${salt}$${hash}`;
}

/**
 * Extract session token from request cookies
 */
export function getSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map(c => c.trim());
  for (const cookie of cookies) {
    const [name, value] = cookie.split('=');
    if (name === SESSION_COOKIE) {
      return value;
    }
  }
  return null;
}

/**
 * Check if request is authenticated
 */
export async function isAuthenticated(request: Request, env: Env): Promise<boolean> {
  const token = getSessionToken(request);
  if (!token) return false;

  const session = await getSession(env.KV, token);
  return session !== null;
}

/**
 * Login handler - validates credentials and creates session
 */
export async function login(
  username: string,
  password: string,
  env: Env
): Promise<{ success: boolean; token?: string; error?: string }> {
  // Check credentials
  if (username !== env.ADMIN_USERNAME) {
    return { success: false, error: 'Invalid credentials' };
  }

  const valid = await verifyPassword(password, env.ADMIN_PASSWORD_HASH);
  if (!valid) {
    return { success: false, error: 'Invalid credentials' };
  }

  // Create session
  const session = await createSession(env.KV, SESSION_TTL);
  return { success: true, token: session.token };
}

/**
 * Logout handler - deletes session
 */
export async function logout(request: Request, env: Env): Promise<void> {
  const token = getSessionToken(request);
  if (token) {
    await deleteSession(env.KV, token);
  }
}

/**
 * Create Set-Cookie header for session
 */
export function createSessionCookie(token: string, maxAge: number = SESSION_TTL): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

/**
 * Create Set-Cookie header to clear session
 */
export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}
