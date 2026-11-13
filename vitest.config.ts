import { readFileSync } from 'node:fs';
import path from 'node:path';
import { builtinModules } from 'node:module';
import { defineWorkersConfig, readD1Migrations } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig(async () => {
  // Admin sign-in's tables, from the real migrations (src/__tests__/support/auth.ts applies them).
  const migrations = await readD1Migrations(path.join(__dirname, 'migrations'));
  // The tests run against production's sign-in settings, not a local GAuth's from .dev.vars.
  const certs = /GAUTH_CERTS = "([^"]+)"/.exec(readFileSync(path.join(__dirname, 'wrangler.toml'), 'utf8'))![1]!.replaceAll('\\n', '\n');
  return {
    test: {
      globals: true,
      poolOptions: {
        workers: {
          wrangler: { configPath: './wrangler.toml' },
          miniflare: {
            bindings: {
              TEST_MIGRATIONS: migrations,
              BETTER_AUTH_SECRET: 'better-auth-test-secret-0123456789abcdef',
              APP_ORIGIN: 'https://gpeake.com',
              GAUTH_ORIGIN: 'https://auth.gpeake.com',
              GAUTH_CERTS: certs,
            },
          },
        },
      },
      // samlify (GAuth sign-in) is CommonJS whose default imports only work in
      // workerd once Vite has bundled it; Node built-ins come from nodejs_compat.
      deps: {
        optimizer: {
          ssr: {
            enabled: true,
            include: ['samlify'],
            esbuildOptions: { external: ['node:*', ...builtinModules] },
          },
        },
      },
    },
  };
});
