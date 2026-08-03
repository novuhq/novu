import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { fcmOverrideJsonSchema } from '../src/consts/providers/provider-overrides/fcm/fcm-override.generated';
import { fcmOverrideLiquidTolerantJsonSchema } from '../src/consts/providers/provider-overrides/fcm/fcm-override.liquid-tolerant.generated';
import { FCM_OVERRIDE_KEYS } from '../src/consts/providers/provider-overrides/fcm/keys';
import { NON_OVERRIDABLE_FCM_KEYS } from './fcm-override.type';
import { buildFcmOverrideSchemas } from './generate-fcm-override-schema';

const REGENERATE_HINT = 'Run `pnpm --filter @novu/shared generate:fcm-schema` and commit the result.';
const DRIFT_ENV_VAR = 'NOVU_TEST_FCM_SCHEMA_DRIFT';
const sharedRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Comparing against a freshly generated schema means running ts-json-schema-generator over the
 * firebase-admin messaging types, which every `vitest` run of this package would otherwise pay
 * for. CI always runs it; locally it is opt-in.
 */
const isDriftCheckEnabled = process.env.CI === 'true' || process.env[DRIFT_ENV_VAR] === 'true';

const SKIP_HINT = `run \`${DRIFT_ENV_VAR}=true pnpm --filter @novu/shared test\` to check this locally`;

let regeneratedSchemas: ReturnType<typeof buildFcmOverrideSchemas> | undefined;

/** Lazy so the generator never runs when the suite is skipped, and only once when it is not. */
function regenerate() {
  regeneratedSchemas ??= buildFcmOverrideSchemas();

  return regeneratedSchemas;
}

function resolveRelativeImport(fromDir: string, specifier: string): string | undefined {
  const base = join(fromDir, specifier.replace(/\.ts$/, ''));

  return [`${base}.ts`, join(base, 'index.ts')].find((candidate) => existsSync(candidate));
}

/** Whole-graph stand-in for what a bundler would pull in through the package entry point. */
function modulesReachableFrom(entry: string): Set<string> {
  const seen = new Set<string>();
  const pending = [entry];

  while (pending.length > 0) {
    const file = pending.pop() as string;
    if (seen.has(file)) {
      continue;
    }
    seen.add(file);

    for (const [, specifier] of readFileSync(file, 'utf8').matchAll(/\bfrom '(\.[^']+)'/g)) {
      const resolved = resolveRelativeImport(dirname(file), specifier as string);
      if (resolved) {
        pending.push(resolved);
      }
    }
  }

  return seen;
}

describe('regenerated FCM override schema', () => {
  it(`matches the committed artifact. ${REGENERATE_HINT}`, (ctx) => {
    ctx.skip(!isDriftCheckEnabled, SKIP_HINT);

    expect(fcmOverrideJsonSchema).toEqual(regenerate().schema);
  });

  it(`matches the committed liquid-tolerant artifact. ${REGENERATE_HINT}`, (ctx) => {
    ctx.skip(!isDriftCheckEnabled, SKIP_HINT);

    expect(fcmOverrideLiquidTolerantJsonSchema).toEqual(regenerate().liquidTolerantSchema);
  });
});

describe('committed FCM override schema', () => {
  it('keeps the hand-written key list in step with the schema', () => {
    expect([...FCM_OVERRIDE_KEYS]).toEqual(Object.keys(fcmOverrideJsonSchema.properties ?? {}));
  });

  it('never exposes the routing fields Novu resolves itself', () => {
    for (const key of NON_OVERRIDABLE_FCM_KEYS) {
      expect(fcmOverrideJsonSchema.properties?.[key]).toBeUndefined();
    }
  });

  it('keeps notification.body available and top-level required absent for partial patches', () => {
    expect(fcmOverrideJsonSchema.required).toBeUndefined();
    expect(fcmOverrideJsonSchema.definitions?.Notification).toMatchObject({
      properties: {
        body: { type: 'string' },
      },
    });
  });

  it('resolves every internal reference so AJV can compile it standalone', () => {
    for (const schema of [fcmOverrideJsonSchema, fcmOverrideLiquidTolerantJsonSchema]) {
      const defined = new Set(Object.keys(schema.definitions ?? {}));
      const referenced = [...JSON.stringify(schema).matchAll(/#\/definitions\/([^"]+)"/g)].map(([, name]) =>
        decodeURIComponent(name as string)
      );

      expect(referenced.filter((name) => !defined.has(name))).toEqual([]);
    }
  });

  it('keeps the full schema out of the package barrel so it is not bundled eagerly', () => {
    const reachable = [...modulesReachableFrom(join(sharedRoot, 'src/index.ts'))];

    expect(reachable.filter((file) => file.includes('/fcm/') && file.endsWith('.generated.ts'))).toEqual([]);
    expect(reachable).toContain(join(sharedRoot, 'src/consts/providers/provider-overrides/fcm/keys.ts'));
  });
});
