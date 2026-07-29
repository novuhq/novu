import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGenerator } from 'ts-json-schema-generator';
import { toLiquidTolerantSchema } from '../src/consts/providers/provider-overrides/liquid-tolerant.ts';
import type { JSONSchemaDto } from '../src/dto/workflows/json-schema-dto.ts';
import { NON_OVERRIDABLE_TELEGRAM_KEYS } from './telegram-override.type.ts';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(scriptDir, '..');
const outputDir = join(scriptDir, '../src/consts/providers/provider-overrides/telegram');
const typeFile = join(scriptDir, 'telegram-override.type.ts');

const ROOT_TYPE = 'TelegramOverride';
const GENERATE_COMMAND = 'pnpm --filter @novu/shared generate:telegram-schema';

function definitionKeyOf(ref: string): string {
  return decodeURIComponent(ref.replace('#/definitions/', ''));
}

/** Follows the `$ref` chain the generator puts in front of a named alias down to the real object. */
function inlineRootNode(schema: JSONSchemaDto): JSONSchemaDto {
  const definitions = schema.definitions ?? {};
  let node: JSONSchemaDto = schema;

  while (node.$ref) {
    const resolved = definitions[definitionKeyOf(node.$ref)];
    if (resolved === undefined || typeof resolved === 'boolean') {
      throw new Error(`Could not resolve root reference ${node.$ref}.`);
    }
    node = resolved;
  }

  const { $ref: _resolved, $schema: _draft, ...rest } = node as JSONSchemaDto & { $schema?: string };

  // `$schema` is dropped: JSONSchemaDto describes draft-07 already, and the liquid-tolerant
  // derivation would strand the declaration inside an `anyOf` branch.
  return { ...rest, definitions } as JSONSchemaDto;
}

/**
 * An override is a patch onto the compiled step body, so nothing in it is mandatory — the
 * generator's `required` comes from Telegram's required `text`.
 */
function makeEveryTopLevelKeyOptional(schema: JSONSchemaDto): JSONSchemaDto {
  const { required: _dropped, ...rest } = schema;

  return rest;
}

type SchemaNode = Record<string, unknown>;

/** Rewrites every object in the schema tree bottom-up, so a parent sees its rewritten children. */
function mapSchemaNodes(value: unknown, visit: (node: SchemaNode) => SchemaNode): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => mapSchemaNodes(entry, visit));
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  const withMappedChildren = Object.fromEntries(
    Object.entries(value as SchemaNode).map(([key, child]) => [key, mapSchemaNodes(child, visit)])
  );

  return visit(withMappedChildren);
}

/**
 * `ts-json-schema-generator` emits a `deprecated` string from `@deprecated` JSDoc. `JSONSchemaDto`
 * does not model that keyword, so fold it into `description` (where autocomplete already reads).
 */
function foldDeprecatedIntoDescription(schema: JSONSchemaDto): JSONSchemaDto {
  return mapSchemaNodes(schema, (node) => {
    if (typeof node.deprecated !== 'string') {
      return node;
    }

    const { deprecated, ...rest } = node;
    const note = `Deprecated: ${deprecated}`;

    return {
      ...rest,
      description: typeof rest.description === 'string' ? `${rest.description} ${note}` : note,
    };
  }) as JSONSchemaDto;
}

function assertRoutingKeysAreAbsent(schema: JSONSchemaDto): void {
  for (const key of NON_OVERRIDABLE_TELEGRAM_KEYS) {
    if (schema.properties?.[key] !== undefined) {
      throw new Error(`\`${key}\` must not be overridable — it is resolved from subscriber routing.`);
    }
  }
}

/**
 * `@grammyjs/types` package entry does not expand under `ts-json-schema-generator` (nested types
 * become `{}`). Pointing `paths` at the resolved `mod.d.ts` makes the generator follow the real
 * declaration files the same way a relative import into the package does.
 */
function writeGeneratorTsconfig(): string {
  const require = createRequire(import.meta.url);
  const grammyMod = require.resolve('@grammyjs/types');
  const grammyTypesEntry = grammyMod.endsWith('.d.ts') ? grammyMod : join(dirname(grammyMod), 'mod.d.ts');
  const dir = mkdtempSync(join(tmpdir(), 'novu-telegram-schema-'));
  const tsconfigPath = join(dir, 'tsconfig.json');

  writeFileSync(
    tsconfigPath,
    JSON.stringify(
      {
        compilerOptions: {
          strict: true,
          skipLibCheck: true,
          module: 'esnext',
          moduleResolution: 'bundler',
          target: 'es2022',
          allowImportingTsExtensions: true,
          noEmit: true,
          baseUrl: packageRoot,
          paths: {
            '@grammyjs/types': [grammyTypesEntry],
          },
        },
        include: [typeFile],
      },
      null,
      2
    )
  );

  return tsconfigPath;
}

export function buildTelegramOverrideSchemas(): {
  schema: JSONSchemaDto;
  liquidTolerantSchema: JSONSchemaDto;
} {
  const config = {
    path: typeFile,
    tsconfig: writeGeneratorTsconfig(),
    type: ROOT_TYPE,
    // Nested reply_markup / MessageEntity unions stay as named definitions so the artifact stays
    // small enough for a lazy dashboard chunk.
    expose: 'all' as const,
    topRef: false,
    jsDoc: 'extended' as const,
    additionalProperties: false,
    skipTypeCheck: true,
    sortProps: true,
  };

  const generated = createGenerator(config).createSchema(ROOT_TYPE) as JSONSchemaDto;
  const schema = [inlineRootNode, makeEveryTopLevelKeyOptional, foldDeprecatedIntoDescription].reduce<JSONSchemaDto>(
    (current, step) => step(current),
    generated
  );

  assertRoutingKeysAreAbsent(schema);

  if (!schema.properties || Object.keys(schema.properties).length === 0) {
    throw new Error('Generated Telegram override schema has no properties — generator input likely collapsed.');
  }

  return { schema, liquidTolerantSchema: toLiquidTolerantSchema(schema) };
}

function renderModule(exportName: string, schema: JSONSchemaDto, note: string): string {
  return `// Generated by \`${GENERATE_COMMAND}\` from \`scripts/telegram-override.type.ts\`.
// Do not edit by hand — \`scripts/telegram-override.drift.spec.ts\` fails when this file and the
// upstream @grammyjs/types sendMessage args disagree.
// ${note}
import type { JSONSchemaDto } from '../../../../dto/workflows/json-schema-dto';

export const ${exportName}: JSONSchemaDto = ${JSON.stringify(schema, null, 2)};
`;
}

function main(): void {
  const { schema, liquidTolerantSchema } = buildTelegramOverrideSchemas();

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(
    join(outputDir, 'telegram-override.generated.ts'),
    renderModule(
      'telegramOverrideJsonSchema',
      schema,
      'Mirrors Bot API `sendMessage` args minus the routing fields Novu owns.'
    )
  );
  writeFileSync(
    join(outputDir, 'telegram-override.liquid-tolerant.generated.ts'),
    renderModule(
      'telegramOverrideLiquidTolerantJsonSchema',
      liquidTolerantSchema,
      'Liquid-tolerant derivation of the schema above, used to validate stored (uncompiled) overrides.'
    )
  );

  process.stdout.write(`Wrote Telegram override schemas to ${outputDir}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
