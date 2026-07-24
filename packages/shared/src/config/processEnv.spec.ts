import { describe, expect, it } from 'vitest';
import { getEnvFileNameForNodeEnv, resolveDotenvPath } from './processEnv';

/** Posix-style path.join is enough for these tests — no Windows separators in inputs. */
function join(...segments: string[]): string {
  return segments.join('/');
}

/** Build a `fileExists` predicate backed by a set of "existing" paths. */
function existsFromSet(existing: string[]): (p: string) => boolean {
  const set = new Set(existing);

  return (p) => set.has(p);
}

describe('getEnvFileNameForNodeEnv', () => {
  it('maps known NODE_ENV values to the canonical file name', () => {
    expect(getEnvFileNameForNodeEnv('production')).toBe('.env.production');
    expect(getEnvFileNameForNodeEnv('test')).toBe('.env.test');
    expect(getEnvFileNameForNodeEnv('ci')).toBe('.env.ci');
    expect(getEnvFileNameForNodeEnv('dev')).toBe('.env.development');
    expect(getEnvFileNameForNodeEnv('local')).toBe('.env');
  });

  it('defaults to `.env` when NODE_ENV is unset', () => {
    expect(getEnvFileNameForNodeEnv()).toBe('.env');
    expect(getEnvFileNameForNodeEnv(undefined)).toBe('.env');
  });

  it('returns undefined for unrecognized NODE_ENV values', () => {
    // Legacy behavior: the map is indexed without a default — unknown values
    // surface as `undefined` so misconfiguration is loud rather than silent.
    expect(getEnvFileNameForNodeEnv('something-unknown')).toBeUndefined();
  });
});

describe('resolveDotenvPath', () => {
  const overrideDir = 'apps/worker';
  const defaultDir = 'apps/worker/src';

  it('prefers an explicit `.env.<NODE_ENV>` override over everything else', () => {
    const chosen = resolveDotenvPath({
      overrideDir,
      defaultDir,
      nodeEnv: 'production',
      fileExists: existsFromSet(['apps/worker/.env.production', 'apps/worker/.env', 'apps/worker/src/.env.production']),
      join,
    });

    expect(chosen).toBe('apps/worker/.env.production');
  });

  it('falls back to the generic `.env` override when no explicit per-env override exists', () => {
    const chosen = resolveDotenvPath({
      overrideDir,
      defaultDir,
      nodeEnv: 'production',
      fileExists: existsFromSet(['apps/worker/.env', 'apps/worker/src/.env.production']),
      join,
    });

    expect(chosen).toBe('apps/worker/.env');
  });

  it('falls back to the committed in-tree default last', () => {
    const chosen = resolveDotenvPath({
      overrideDir,
      defaultDir,
      nodeEnv: 'production',
      fileExists: existsFromSet(['apps/worker/src/.env.production']),
      join,
    });

    expect(chosen).toBe('apps/worker/src/.env.production');
  });

  it('returns undefined when no candidate exists', () => {
    const chosen = resolveDotenvPath({
      overrideDir,
      defaultDir,
      nodeEnv: 'production',
      fileExists: () => false,
      join,
    });

    expect(chosen).toBeUndefined();
  });

  describe('isolated NODE_ENV runs', () => {
    it('NEVER falls back to the generic `.env` override for NODE_ENV=test', () => {
      const chosen = resolveDotenvPath({
        overrideDir,
        defaultDir,
        nodeEnv: 'test',
        // Only the generic override exists — a developer's 1Password file
        // pointing at staging/dev credentials. We must skip it and continue
        // to the in-tree default to avoid trashing the wrong database.
        fileExists: existsFromSet(['apps/worker/.env', 'apps/worker/src/.env.test']),
        join,
      });

      expect(chosen).toBe('apps/worker/src/.env.test');
    });

    it('NEVER falls back to the generic `.env` override for NODE_ENV=ci', () => {
      const chosen = resolveDotenvPath({
        overrideDir,
        defaultDir,
        nodeEnv: 'ci',
        fileExists: existsFromSet(['apps/worker/.env', 'apps/worker/src/.env.ci']),
        join,
      });

      expect(chosen).toBe('apps/worker/src/.env.ci');
    });

    it('STILL honors an explicit `.env.test` override for NODE_ENV=test', () => {
      const chosen = resolveDotenvPath({
        overrideDir,
        defaultDir,
        nodeEnv: 'test',
        fileExists: existsFromSet(['apps/worker/.env.test', 'apps/worker/.env', 'apps/worker/src/.env.test']),
        join,
      });

      expect(chosen).toBe('apps/worker/.env.test');
    });

    it('returns undefined for NODE_ENV=test when only the generic override exists', () => {
      const chosen = resolveDotenvPath({
        overrideDir,
        defaultDir,
        nodeEnv: 'test',
        fileExists: existsFromSet(['apps/worker/.env']),
        join,
      });

      // The dangerous file is the *only* candidate that exists, and we
      // refuse to pick it under NODE_ENV=test. Returning undefined surfaces
      // the misconfiguration loudly (dotenv won't load anything) instead of
      // silently mutating the wrong database.
      expect(chosen).toBeUndefined();
    });
  });

  it('handles the unset / local NODE_ENV case without duplicating the `.env` candidate', () => {
    const seen: string[] = [];
    resolveDotenvPath({
      overrideDir,
      defaultDir,
      nodeEnv: undefined,
      fileExists: (p) => {
        seen.push(p);

        return false;
      },
      join,
    });

    // For NODE_ENV=undefined the resolved file name is `.env`, so the
    // generic-override candidate must not be pushed twice.
    expect(seen).toEqual(['apps/worker/.env', 'apps/worker/src/.env']);
  });

  it('supports apps whose override and default directories are the same (inbound-mail layout)', () => {
    const chosen = resolveDotenvPath({
      overrideDir: 'apps/inbound-mail',
      defaultDir: 'apps/inbound-mail',
      nodeEnv: 'test',
      fileExists: existsFromSet(['apps/inbound-mail/.env.test', 'apps/inbound-mail/.env']),
      join,
    });

    expect(chosen).toBe('apps/inbound-mail/.env.test');
  });
});
