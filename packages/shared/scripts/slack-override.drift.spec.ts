import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SLACK_OVERRIDE_KEYS } from '../src/consts/providers/provider-overrides/slack/keys';
import { slackOverrideJsonSchema } from '../src/consts/providers/provider-overrides/slack/slack-override.generated';
import { slackOverrideLiquidTolerantJsonSchema } from '../src/consts/providers/provider-overrides/slack/slack-override.liquid-tolerant.generated';
import { buildSlackOverrideSchemas } from './generate-slack-override-schema';
import { NON_OVERRIDABLE_SLACK_KEYS } from './slack-override.type';

const REGENERATE_HINT = 'Run `pnpm --filter @novu/shared generate:slack-schema` and commit the result.';
const DRIFT_ENV_VAR = 'NOVU_TEST_SLACK_SCHEMA_DRIFT';
const sharedRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Comparing against a freshly generated schema means running ts-json-schema-generator over the
 * Slack SDK types, which every `vitest` run of this package would otherwise pay for. CI always
 * runs it; locally it is opt-in.
 */
const isDriftCheckEnabled = process.env.CI === 'true' || process.env[DRIFT_ENV_VAR] === 'true';

const SKIP_HINT = `run \`${DRIFT_ENV_VAR}=true pnpm --filter @novu/shared test\` to check this locally`;

let regeneratedSchemas: ReturnType<typeof buildSlackOverrideSchemas> | undefined;

/** Lazy so the generator never runs when the suite is skipped, and only once when it is not. */
function regenerate() {
  regeneratedSchemas ??= buildSlackOverrideSchemas();

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

describe('regenerated Slack override schema', () => {
  it(`matches the committed artifact. ${REGENERATE_HINT}`, (ctx) => {
    ctx.skip(!isDriftCheckEnabled, SKIP_HINT);

    expect(slackOverrideJsonSchema).toEqual(regenerate().schema);
  });

  it(`matches the committed liquid-tolerant artifact. ${REGENERATE_HINT}`, (ctx) => {
    ctx.skip(!isDriftCheckEnabled, SKIP_HINT);

    expect(slackOverrideLiquidTolerantJsonSchema).toEqual(regenerate().liquidTolerantSchema);
  });
});

describe('committed Slack override schema', () => {
  it('keeps the hand-written key list in step with the schema', () => {
    expect([...SLACK_OVERRIDE_KEYS]).toEqual(Object.keys(slackOverrideJsonSchema.properties ?? {}));
  });

  it('never exposes the routing fields Novu resolves itself', () => {
    for (const key of NON_OVERRIDABLE_SLACK_KEYS) {
      expect(slackOverrideJsonSchema.properties?.[key]).toBeUndefined();
    }
  });

  it('resolves every internal reference so AJV can compile it standalone', () => {
    for (const schema of [slackOverrideJsonSchema, slackOverrideLiquidTolerantJsonSchema]) {
      const defined = new Set(Object.keys(schema.definitions ?? {}));
      const referenced = [...JSON.stringify(schema).matchAll(/#\/definitions\/([^"]+)"/g)].map(([, name]) =>
        decodeURIComponent(name as string)
      );

      expect(referenced.filter((name) => !defined.has(name))).toEqual([]);
    }
  });

  it('keeps the full schema out of the package barrel so it is not bundled eagerly', () => {
    const reachable = [...modulesReachableFrom(join(sharedRoot, 'src/index.ts'))];

    expect(reachable.filter((file) => file.endsWith('.generated.ts'))).toEqual([]);
    expect(reachable).toContain(join(sharedRoot, 'src/consts/providers/provider-overrides/slack/keys.ts'));
  });
});
