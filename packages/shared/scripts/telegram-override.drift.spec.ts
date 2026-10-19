import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TELEGRAM_OVERRIDE_KEYS } from '../src/consts/providers/provider-overrides/telegram/keys';
import { telegramOverrideJsonSchema } from '../src/consts/providers/provider-overrides/telegram/telegram-override.generated';
import { telegramOverrideLiquidTolerantJsonSchema } from '../src/consts/providers/provider-overrides/telegram/telegram-override.liquid-tolerant.generated';
import { buildTelegramOverrideSchemas } from './generate-telegram-override-schema';
import { NON_OVERRIDABLE_TELEGRAM_KEYS } from './telegram-override.type';

const REGENERATE_HINT = 'Run `pnpm --filter @novu/shared generate:telegram-schema` and commit the result.';
const DRIFT_ENV_VAR = 'NOVU_TEST_TELEGRAM_SCHEMA_DRIFT';
const sharedRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Comparing against a freshly generated schema means running ts-json-schema-generator over the
 * Telegram Bot API types, which every `vitest` run of this package would otherwise pay for. CI
 * always runs it; locally it is opt-in.
 */
const isDriftCheckEnabled = process.env.CI === 'true' || process.env[DRIFT_ENV_VAR] === 'true';

const SKIP_HINT = `run \`${DRIFT_ENV_VAR}=true pnpm --filter @novu/shared test\` to check this locally`;

let regeneratedSchemas: ReturnType<typeof buildTelegramOverrideSchemas> | undefined;

/** Lazy so the generator never runs when the suite is skipped, and only once when it is not. */
function regenerate() {
  regeneratedSchemas ??= buildTelegramOverrideSchemas();

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

describe('regenerated Telegram override schema', () => {
  it(`matches the committed artifact. ${REGENERATE_HINT}`, (ctx) => {
    ctx.skip(!isDriftCheckEnabled, SKIP_HINT);

    expect(telegramOverrideJsonSchema).toEqual(regenerate().schema);
  });

  it(`matches the committed liquid-tolerant artifact. ${REGENERATE_HINT}`, (ctx) => {
    ctx.skip(!isDriftCheckEnabled, SKIP_HINT);

    expect(telegramOverrideLiquidTolerantJsonSchema).toEqual(regenerate().liquidTolerantSchema);
  });
});

describe('committed Telegram override schema', () => {
  it('keeps the hand-written key list in step with the schema', () => {
    expect([...TELEGRAM_OVERRIDE_KEYS]).toEqual(Object.keys(telegramOverrideJsonSchema.properties ?? {}));
  });

  it('never exposes the routing fields Novu resolves itself', () => {
    for (const key of NON_OVERRIDABLE_TELEGRAM_KEYS) {
      expect(telegramOverrideJsonSchema.properties?.[key]).toBeUndefined();
    }
  });

  it('resolves every internal reference so AJV can compile it standalone', () => {
    for (const schema of [telegramOverrideJsonSchema, telegramOverrideLiquidTolerantJsonSchema]) {
      const defined = new Set(Object.keys(schema.definitions ?? {}));
      const referenced = [...JSON.stringify(schema).matchAll(/#\/definitions\/([^"]+)"/g)].map(([, name]) =>
        decodeURIComponent(name as string)
      );

      expect(referenced.filter((name) => !defined.has(name))).toEqual([]);
    }
  });

  it('keeps the full schema out of the package barrel so it is not bundled eagerly', () => {
    const reachable = [...modulesReachableFrom(join(sharedRoot, 'src/index.ts'))];

    expect(reachable.filter((file) => file.includes('/telegram/') && file.endsWith('.generated.ts'))).toEqual([]);
    expect(reachable).toContain(join(sharedRoot, 'src/consts/providers/provider-overrides/telegram/keys.ts'));
  });
});
