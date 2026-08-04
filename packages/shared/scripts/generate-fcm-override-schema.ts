import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGenerator } from 'ts-json-schema-generator';
import { FCM_ROUTING_KEYS } from '../src/consts/providers/provider-overrides/fcm/keys.ts';
import { toLiquidTolerantSchema } from '../src/consts/providers/provider-overrides/liquid-tolerant.ts';
import type { JSONSchemaDto } from '../src/dto/workflows/json-schema-dto.ts';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(scriptDir, '..');
const outputDir = join(scriptDir, '../src/consts/providers/provider-overrides/fcm');
const typeFile = join(scriptDir, 'fcm-override.type.ts');

const ROOT_TYPE = 'FcmOverride';
const GENERATE_COMMAND = 'pnpm --filter @novu/shared generate:fcm-schema';

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
 * An override is a patch onto the compiled step body, so nothing in it is mandatory — BaseMessage
 * fields are already optional, but drop any top-level `required` the generator may emit.
 */
function makeEveryTopLevelKeyOptional(schema: JSONSchemaDto): JSONSchemaDto {
  const { required: _dropped, ...rest } = schema;

  return rest;
}

function assertRoutingKeysArePresent(schema: JSONSchemaDto): void {
  for (const key of FCM_ROUTING_KEYS) {
    if (schema.properties?.[key] === undefined) {
      throw new Error(
        `\`${key}\` must be present on the FCM override schema — routing fields are content-overridable.`
      );
    }
  }
}

function pairwiseMutualExclusion(keys: readonly string[]): JSONSchemaDto[] {
  const constraints: JSONSchemaDto[] = [];

  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      constraints.push({
        not: { required: [keys[i] as string, keys[j] as string] },
      });
    }
  }

  return constraints;
}

/** At most one of token / tokens / topic / condition in a single content override. */
function appendRoutingKeyMutualExclusion(schema: JSONSchemaDto): JSONSchemaDto {
  const constraints = pairwiseMutualExclusion(FCM_ROUTING_KEYS);
  const existing = Array.isArray(schema.allOf) ? schema.allOf : [];

  return {
    ...schema,
    allOf: [...existing, ...constraints],
  };
}

/**
 * After `inlineRootNode`, `expose: 'all'` still leaves the original root alias (e.g. `BaseMessage`)
 * as an unreferenced definition. Drop those so committed artifacts stay lean.
 */
function pruneUnreferencedDefinitions(schema: JSONSchemaDto): JSONSchemaDto {
  const definitions = { ...(schema.definitions ?? {}) };
  const referenced = new Set<string>();

  function visit(value: unknown): void {
    if (Array.isArray(value)) {
      for (const entry of value) {
        visit(entry);
      }

      return;
    }

    if (value === null || typeof value !== 'object') {
      return;
    }

    const node = value as Record<string, unknown>;
    if (typeof node.$ref === 'string') {
      referenced.add(definitionKeyOf(node.$ref));
    }

    for (const child of Object.values(node)) {
      visit(child);
    }
  }

  visit({ ...schema, definitions: undefined });

  let growing = true;
  while (growing) {
    const before = referenced.size;
    for (const name of [...referenced]) {
      visit(definitions[name]);
    }
    growing = referenced.size > before;
  }

  const pruned = Object.fromEntries(
    Object.keys(definitions)
      .filter((name) => referenced.has(name))
      .sort()
      .map((name) => {
        const definition = definitions[name];
        if (definition === undefined) {
          throw new Error(`Missing definition \`${name}\` while pruning unreferenced schemas.`);
        }

        return [name, definition];
      })
  );

  return { ...schema, definitions: pruned };
}

/**
 * `firebase-admin/messaging` package entry does not always expand under `ts-json-schema-generator`
 * (nested types can become `{}`). Pointing `paths` at the resolved messaging declarations makes
 * the generator follow the real `.d.ts` files the same way a relative import into the package does.
 */
function writeGeneratorTsconfig(): string {
  const require = createRequire(import.meta.url);
  const messagingMod = require.resolve('firebase-admin/messaging');
  const messagingTypesEntry = messagingMod.endsWith('.d.ts') ? messagingMod : join(dirname(messagingMod), 'index.d.ts');
  const dir = mkdtempSync(join(tmpdir(), 'novu-fcm-schema-'));
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
            'firebase-admin/messaging': [messagingTypesEntry],
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

export function buildFcmOverrideSchemas(): {
  schema: JSONSchemaDto;
  liquidTolerantSchema: JSONSchemaDto;
} {
  const config = {
    path: typeFile,
    tsconfig: writeGeneratorTsconfig(),
    type: ROOT_TYPE,
    // Nested Android / APNs / Webpush configs stay as named definitions so the artifact stays
    // small enough for a lazy dashboard chunk.
    expose: 'all' as const,
    topRef: false,
    jsDoc: 'extended' as const,
    additionalProperties: false,
    skipTypeCheck: true,
    sortProps: true,
  };

  const generated = createGenerator(config).createSchema(ROOT_TYPE) as JSONSchemaDto;
  const prepared = [inlineRootNode, makeEveryTopLevelKeyOptional, pruneUnreferencedDefinitions].reduce<JSONSchemaDto>(
    (current, step) => step(current),
    generated
  );

  assertRoutingKeysArePresent(prepared);

  if (!prepared.properties || Object.keys(prepared.properties).length === 0) {
    throw new Error('Generated FCM override schema has no properties — generator input likely collapsed.');
  }

  const schema = appendRoutingKeyMutualExclusion(prepared);

  return { schema, liquidTolerantSchema: toLiquidTolerantSchema(schema) };
}

function renderModule(exportName: string, schema: JSONSchemaDto, note: string): string {
  return `// Generated by \`${GENERATE_COMMAND}\` from \`scripts/fcm-override.type.ts\`.
// Do not edit by hand — \`scripts/fcm-override.drift.spec.ts\` fails when this file and the
// upstream firebase-admin BaseMessage types disagree.
// ${note}
import type { JSONSchemaDto } from '../../../../dto/workflows/json-schema-dto';

export const ${exportName}: JSONSchemaDto = ${JSON.stringify(schema, null, 2)};
`;
}

function main(): void {
  const { schema, liquidTolerantSchema } = buildFcmOverrideSchemas();

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(
    join(outputDir, 'fcm-override.generated.ts'),
    renderModule(
      'fcmOverrideJsonSchema',
      schema,
      'Mirrors firebase-admin `BaseMessage` plus optional routing fields (token/tokens/topic/condition).'
    )
  );
  writeFileSync(
    join(outputDir, 'fcm-override.liquid-tolerant.generated.ts'),
    renderModule(
      'fcmOverrideLiquidTolerantJsonSchema',
      liquidTolerantSchema,
      'Liquid-tolerant derivation of the schema above, used to validate stored (uncompiled) overrides.'
    )
  );

  process.stdout.write(`Wrote FCM override schemas to ${outputDir}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
