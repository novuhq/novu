import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  NON_OVERRIDABLE_WHATSAPP_KEYS,
  WHATSAPP_OVERRIDE_KEYS,
} from '../src/consts/providers/provider-overrides/whatsapp/keys';
import { whatsappOverrideJsonSchema } from '../src/consts/providers/provider-overrides/whatsapp/whatsapp-override.generated';
import { whatsappOverrideLiquidTolerantJsonSchema } from '../src/consts/providers/provider-overrides/whatsapp/whatsapp-override.liquid-tolerant.generated';
import { buildWhatsappOverrideSchemas } from './generate-whatsapp-override-schema';

const REGENERATE_HINT = 'Run `pnpm --filter @novu/shared generate:whatsapp-schema` and commit the result.';
const DRIFT_ENV_VAR = 'NOVU_TEST_WHATSAPP_SCHEMA_DRIFT';
const scriptDir = dirname(fileURLToPath(import.meta.url));
const sharedRoot = join(scriptDir, '..');
const vendorPath = join(scriptDir, 'vendor/whatsapp-messages.openapi.json');

const EXPECTED_TOP_LEVEL_KEYS = [
  'audio',
  'contacts',
  'context',
  'document',
  'image',
  'interactive',
  'location',
  'reaction',
  'recipient_type',
  'sticker',
  'template',
  'text',
  'type',
  'video',
] as const;

/**
 * Comparing against a freshly generated schema means walking the vendored Meta OpenAPI closure,
 * which every `vitest` run of this package would otherwise pay for. CI always runs it; locally it
 * is opt-in.
 */
const isDriftCheckEnabled = process.env.CI === 'true' || process.env[DRIFT_ENV_VAR] === 'true';

const SKIP_HINT = `run \`${DRIFT_ENV_VAR}=true pnpm --filter @novu/shared test\` to check this locally`;

let regeneratedSchemas: ReturnType<typeof buildWhatsappOverrideSchemas> | undefined;

/** Lazy so the generator never runs when the suite is skipped, and only once when it is not. */
function regenerate() {
  regeneratedSchemas ??= buildWhatsappOverrideSchemas();

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

describe('vendored WhatsApp OpenAPI Message closure', () => {
  it('loads and includes Message + TextMessage', () => {
    expect(existsSync(vendorPath)).toBe(true);

    const vendor = JSON.parse(readFileSync(vendorPath, 'utf8')) as {
      meta?: { upstreamCommit?: string; upstreamFile?: string };
      schemas?: Record<string, unknown>;
    };

    expect(vendor.meta?.upstreamFile).toBe('business-messaging-api_v23.0.yaml');
    expect(vendor.meta?.upstreamCommit).toBe('5f30dc1c6b482e67149ae6de0b27f19285d12839');
    expect(vendor.schemas?.Message).toBeDefined();
    expect(vendor.schemas?.TextMessage).toBeDefined();
  });
});

describe('WhatsApp override schema generator', () => {
  it('produces a flat root with the expected 14 keys and no routing keys', () => {
    const { schema } = buildWhatsappOverrideSchemas();
    const keys = Object.keys(schema.properties ?? {}).sort();

    expect(keys).toEqual([...EXPECTED_TOP_LEVEL_KEYS]);
    expect(schema.properties?.messaging_product).toBeUndefined();
    expect(schema.properties?.to).toBeUndefined();
    expect(schema.additionalProperties).toBe(false);
  });
});

describe('regenerated WhatsApp override schema', () => {
  it(`matches the committed artifact. ${REGENERATE_HINT}`, (ctx) => {
    ctx.skip(!isDriftCheckEnabled, SKIP_HINT);

    expect(whatsappOverrideJsonSchema).toEqual(regenerate().schema);
  });

  it(`matches the committed liquid-tolerant artifact. ${REGENERATE_HINT}`, (ctx) => {
    ctx.skip(!isDriftCheckEnabled, SKIP_HINT);

    expect(whatsappOverrideLiquidTolerantJsonSchema).toEqual(regenerate().liquidTolerantSchema);
  });
});

describe('committed WhatsApp override schema', () => {
  it('keeps the hand-written key list in step with the schema', () => {
    expect([...WHATSAPP_OVERRIDE_KEYS]).toEqual(Object.keys(whatsappOverrideJsonSchema.properties ?? {}));
  });

  it('never exposes the routing fields Novu resolves itself', () => {
    for (const key of NON_OVERRIDABLE_WHATSAPP_KEYS) {
      expect(whatsappOverrideJsonSchema.properties?.[key]).toBeUndefined();
    }
  });

  it('resolves every internal reference so AJV can compile it standalone', () => {
    for (const schema of [whatsappOverrideJsonSchema, whatsappOverrideLiquidTolerantJsonSchema]) {
      const defined = new Set(Object.keys(schema.definitions ?? {}));
      const referenced = [...JSON.stringify(schema).matchAll(/#\/definitions\/([^"]+)"/g)].map(([, name]) =>
        decodeURIComponent(name as string)
      );

      expect(referenced.filter((name) => !defined.has(name))).toEqual([]);
    }
  });

  it('keeps the full schema out of the package barrel so it is not bundled eagerly', () => {
    const reachable = [...modulesReachableFrom(join(sharedRoot, 'src/index.ts'))];

    expect(reachable.filter((file) => file.includes('/whatsapp/') && file.endsWith('.generated.ts'))).toEqual([]);
    expect(reachable).toContain(join(sharedRoot, 'src/consts/providers/provider-overrides/whatsapp/keys.ts'));
  });

  it('applies documented Meta spec patches for TemplateComponent index and MediaObject caption', () => {
    const serialized = JSON.stringify(whatsappOverrideJsonSchema);

    expect(serialized).toContain('^[0-9]$');
    expect(serialized).not.toContain('^[2-6, 11-14]$');
    expect(serialized).toContain('"caption"');
    expect(serialized).toContain('"filename"');
  });
});
