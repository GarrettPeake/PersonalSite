/**
 * Test helpers for admin sign-in: the auth tables and real Better Auth sessions.
 */
import { applyD1Migrations, env } from 'cloudflare:test';
import { serializeSignedCookie } from 'better-call';
import { getAuth } from '../../auth/gauth';
import type { Env } from '../../types';

export const APP = 'https://gpeake.com';

export const testEnv = () => env as unknown as Env & { TEST_MIGRATIONS: Parameters<typeof applyD1Migrations>[1] };

/** Create the auth tables (idempotent: applied migrations are recorded). */
export async function migrate() {
  await applyD1Migrations(env.DB, testEnv().TEST_MIGRATIONS);
}

/** A Better Auth session cookie (`name=value`) for a new user with these GAuth roles. */
export async function sessionCookie(roles: string[]): Promise<string> {
  const ctx = await getAuth(testEnv()).$context;
  const user = await ctx.internalAdapter.createUser(
    { email: `${crypto.randomUUID()}@example.com`, name: 'Someone', emailVerified: true, roles },
    { method: 'admin' } as never,
  );
  const session = await ctx.internalAdapter.createSession(user.id);
  const header = await serializeSignedCookie(ctx.authCookies.sessionToken.name, session!.token, ctx.secret);
  return header.split(';')[0]!;
}
