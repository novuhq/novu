import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGenerator } from 'ts-json-schema-generator';
import { toLiquidTolerantSchema } from '../src/consts/providers/provider-overrides/liquid-tolerant.ts';
import type { JSONSchemaDto } from '../src/dto/workflows/json-schema-dto.ts';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const outputDir = join(scriptDir, '../src/consts/providers/provider-overrides/slack');

const ROOT_TYPE = 'SlackOverride';
const GENERATE_COMMAND = 'pnpm --filter @novu/shared generate:slack-schema';

const KNOWN_BLOCK_REF = '#/definitions/KnownBlock';

/**
 * `Block` is an open interface (`{ type: string; block_id?: string }`) and `AnyBlock` is the union
 * that includes it. Leaving either in the schema makes `additionalProperties: false` meaningless
 * for every block, because any object with a `type` string would satisfy it.
 */
const OPEN_BLOCK_DEFINITIONS = ['Block', 'AnyBlock'];

/**
 * Slack's incoming webhook endpoint ignores these. The endpoint type is per-subscriber and unknown
 * when the override is authored, so the schema description is the only place the warning can live
 * — from there it surfaces in editor autocomplete.
 */
const WEBHOOK_UNSUPPORTED_KEYS = ['thread_ts', 'metadata', 'username', 'icon_emoji', 'icon_url'];
const WEBHOOK_UNSUPPORTED_NOTE = 'Not supported when the subscriber is connected via an incoming webhook URL.';

function definitionKeyOf(ref: string): string {
  return decodeURIComponent(ref.replace('#/definitions/', ''));
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

  const { $ref: _resolved, ...rest } = node;

  // `$schema` is dropped: JSONSchemaDto describes draft-07 already, and the liquid-tolerant
  // derivation would strand the declaration inside an `anyOf` branch.
  return { ...rest, definitions } as JSONSchemaDto;
}

function narrowBlocksToKnownBlocks(schema: JSONSchemaDto): JSONSchemaDto {
  const rewritten = mapSchemaNodes(schema, (node) => {
    if (typeof node.$ref === 'string' && OPEN_BLOCK_DEFINITIONS.includes(definitionKeyOf(node.$ref))) {
      return { ...node, $ref: KNOWN_BLOCK_REF };
    }

    if (!Array.isArray(node.anyOf)) {
      return node;
    }

    const seen = new Set<string>();
    const deduped = node.anyOf.filter((member) => {
      const fingerprint = JSON.stringify(member);
      if (seen.has(fingerprint)) {
        return false;
      }
      seen.add(fingerprint);

      return true;
    });

    if (deduped.length !== 1 || typeof deduped[0] !== 'object' || deduped[0] === null) {
      return { ...node, anyOf: deduped };
    }

    const { anyOf: _collapsed, ...withoutComposition } = node;

    return { ...withoutComposition, ...(deduped[0] as SchemaNode) };
  }) as JSONSchemaDto;

  return dropOpenBlockDefinitions(rewritten);
}

function dropOpenBlockDefinitions(schema: JSONSchemaDto): JSONSchemaDto {
  const definitions = { ...(schema.definitions ?? {}) };

  for (const key of OPEN_BLOCK_DEFINITIONS) {
    delete definitions[key];
  }

  const serialized = JSON.stringify({ ...schema, definitions });
  for (const key of OPEN_BLOCK_DEFINITIONS) {
    if (serialized.includes(`#/definitions/${key}"`)) {
      throw new Error(`Definition \`${key}\` is still referenced after narrowing blocks to KnownBlock.`);
    }
  }

  return { ...schema, definitions };
}

/**
 * An override is a patch onto the compiled step body, so nothing in it is mandatory — the
 * generator's `required` comes from Slack's "text or blocks or attachments" union.
 */
function makeEveryTopLevelKeyOptional(schema: JSONSchemaDto): JSONSchemaDto {
  const { required: _dropped, ...rest } = schema;

  return rest;
}

function annotateWebhookUnsupportedKeys(schema: JSONSchemaDto): JSONSchemaDto {
  const properties = { ...(schema.properties ?? {}) };

  for (const key of WEBHOOK_UNSUPPORTED_KEYS) {
    const property = properties[key];
    if (property === undefined || typeof property === 'boolean') {
      throw new Error(`Expected \`${key}\` to be an object schema on the generated Slack override schema.`);
    }

    properties[key] = {
      ...property,
      description: property.description
        ? `${property.description} ${WEBHOOK_UNSUPPORTED_NOTE}`
        : WEBHOOK_UNSUPPORTED_NOTE,
    };
  }

  return { ...schema, properties };
}

function assertRoutingKeysAreAbsent(schema: JSONSchemaDto): void {
  for (const key of ['channel', 'token', 'as_user']) {
    if (schema.properties?.[key] !== undefined) {
      throw new Error(`\`${key}\` must not be overridable — it is resolved from subscriber routing or credentials.`);
    }
  }
}

export function buildSlackOverrideSchemas(): {
  schema: JSONSchemaDto;
  liquidTolerantSchema: JSONSchemaDto;
} {
  const config = {
    path: join(scriptDir, 'slack-override.type.ts'),
    type: ROOT_TYPE,
    // Block Kit nests unions inside unions, so inlining every ref yields a multi-megabyte
    // artifact. Named definitions keep it two orders of magnitude smaller.
    expose: 'all' as const,
    topRef: false,
    jsDoc: 'extended' as const,
    additionalProperties: false,
    skipTypeCheck: true,
    sortProps: true,
  };

  const generated = createGenerator(config).createSchema(ROOT_TYPE) as JSONSchemaDto;
  const schema = annotateWebhookUnsupportedKeys(
    makeEveryTopLevelKeyOptional(narrowBlocksToKnownBlocks(inlineRootNode(generated)))
  );

  assertRoutingKeysAreAbsent(schema);

  return { schema, liquidTolerantSchema: toLiquidTolerantSchema(schema) };
}

function renderModule(exportName: string, schema: JSONSchemaDto, note: string): string {
  return `// Generated by \`${GENERATE_COMMAND}\` from \`scripts/slack-override.type.ts\`.
// Do not edit by hand — \`scripts/slack-override.drift.spec.ts\` fails when this file and the
// upstream @slack/web-api types disagree.
// ${note}
import type { JSONSchemaDto } from '../../../../dto/workflows/json-schema-dto';

export const ${exportName}: JSONSchemaDto = ${JSON.stringify(schema, null, 2)};
`;
}

function main(): void {
  const { schema, liquidTolerantSchema } = buildSlackOverrideSchemas();

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(
    join(outputDir, 'slack-override.generated.ts'),
    renderModule(
      'slackOverrideJsonSchema',
      schema,
      'Mirrors `ChatPostMessageArguments` minus the routing fields Novu owns.'
    )
  );
  writeFileSync(
    join(outputDir, 'slack-override.liquid-tolerant.generated.ts'),
    renderModule(
      'slackOverrideLiquidTolerantJsonSchema',
      liquidTolerantSchema,
      'Liquid-tolerant derivation of the schema above, used to validate stored (uncompiled) overrides.'
    )
  );

  process.stdout.write(`Wrote Slack override schemas to ${outputDir}\n`);
}

if (process.argv[1]?.endsWith('generate-slack-override-schema.ts')) {
  main();
}
