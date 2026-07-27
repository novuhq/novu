/**
 * Builds the WhatsApp Business override JSON Schema from the vendored Meta OpenAPI Message
 * closure (not from an SDK — Meta has no usable types package for Cloud API messages).
 *
 *   pnpm --filter @novu/shared generate:whatsapp-schema
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toLiquidTolerantSchema } from '../src/consts/providers/provider-overrides/liquid-tolerant.ts';
import { NON_OVERRIDABLE_WHATSAPP_KEYS } from '../src/consts/providers/provider-overrides/whatsapp/keys.ts';
import type { JSONSchemaDefinition, JSONSchemaDto } from '../src/dto/workflows/json-schema-dto.ts';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const vendorPath = join(scriptDir, 'vendor/whatsapp-messages.openapi.json');
const outputDir = join(scriptDir, '../src/consts/providers/provider-overrides/whatsapp');

const GENERATE_COMMAND = 'pnpm --filter @novu/shared generate:whatsapp-schema';

/**
 * Flow `data` is a free-form map of screen inputs. Every other object with `properties` gets
 * `additionalProperties: false`. The allowlist throws if this path disappears after an upstream
 * reshape.
 */
const FREE_FORM_FLOW_DATA_PATH = ['flow_action_payload', 'data'] as const;

const BROKEN_TEMPLATE_INDEX_PATTERN = '^[2-6, 11-14]$';
const FIXED_TEMPLATE_INDEX_PATTERN = '^[0-9]$';

type SchemaNode = Record<string, unknown>;
type SchemaMap = Record<string, JSONSchemaDto>;

type VendorFile = {
  schemas: Record<string, unknown>;
};

function isSchemaNode(value: unknown): value is SchemaNode {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function definitionKeyOf(ref: string): string {
  const name = decodeURIComponent(ref.replace(/^#\/(components\/schemas|definitions)\//, ''));
  if (!name || name === ref) {
    throw new Error(`Unsupported schema reference: ${ref}`);
  }

  return name;
}

function toDefinitionsRef(ref: string): string {
  return `#/definitions/${definitionKeyOf(ref)}`;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Rewrites every object in the schema tree bottom-up, so a parent sees its rewritten children. */
function mapSchemaNodes(value: unknown, visit: (node: SchemaNode) => SchemaNode): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => mapSchemaNodes(entry, visit));
  }

  if (!isSchemaNode(value)) {
    return value;
  }

  const withMappedChildren = Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, mapSchemaNodes(child, visit)])
  );

  return visit(withMappedChildren);
}

function rewriteOpenApiRefs(value: unknown): unknown {
  return mapSchemaNodes(value, (node) => {
    if (typeof node.$ref !== 'string') {
      return node;
    }

    return { ...node, $ref: toDefinitionsRef(node.$ref) };
  });
}

function loadVendorDefinitions(): SchemaMap {
  const vendor = JSON.parse(readFileSync(vendorPath, 'utf8')) as VendorFile;
  if (!vendor.schemas?.Message || !vendor.schemas?.TextMessage) {
    throw new Error(`Vendored OpenAPI at ${vendorPath} is missing Message / TextMessage.`);
  }

  const rewritten = rewriteOpenApiRefs(cloneJson(vendor.schemas)) as Record<string, JSONSchemaDto>;

  return rewritten;
}

function resolveRef(definitions: SchemaMap, ref: string): JSONSchemaDto {
  const resolved = definitions[definitionKeyOf(ref)];
  if (resolved === undefined) {
    throw new Error(`Could not resolve ${ref}.`);
  }

  return resolved;
}

function mergeSchemaObjects(left: JSONSchemaDto, right: JSONSchemaDto): JSONSchemaDto {
  const merged: JSONSchemaDto = { ...left, ...right };

  if (left.properties || right.properties) {
    merged.properties = {
      ...(left.properties ?? {}),
      ...(right.properties ?? {}),
    };
  }

  if (left.required || right.required) {
    merged.required = [...new Set([...(left.required ?? []), ...(right.required ?? [])])];
  }

  // Prefer the more specific type enum when a subtype narrows `type`.
  if (left.properties && right.properties) {
    for (const key of Object.keys(right.properties)) {
      const leftProp = left.properties[key];
      const rightProp = right.properties[key];
      if (
        isSchemaNode(leftProp) &&
        isSchemaNode(rightProp) &&
        Array.isArray(rightProp.enum) &&
        !Array.isArray(leftProp.enum) &&
        merged.properties
      ) {
        merged.properties[key] = { ...leftProp, ...rightProp };
      }
    }
  }

  return merged;
}

/**
 * Subtypes are `allOf: [{$ref: Base}, own]`. Merge against the pre-expansion base so the ref back
 * to the discriminator parent cannot recurse through the `anyOf` we are about to install.
 */
function materializeDiscriminatorSubtype(
  subtype: JSONSchemaDto,
  baseName: string,
  baseWithoutDiscriminator: JSONSchemaDto
): JSONSchemaDto {
  if (!Array.isArray(subtype.allOf) || subtype.allOf.length === 0) {
    throw new Error(`Expected discriminator subtype of ${baseName} to be an allOf composition.`);
  }

  let merged: JSONSchemaDto = {};
  for (const member of subtype.allOf) {
    if (typeof member === 'boolean') {
      throw new Error(`Boolean allOf member is not supported while expanding ${baseName}.`);
    }

    if (typeof member.$ref === 'string' && definitionKeyOf(member.$ref) === baseName) {
      merged = mergeSchemaObjects(merged, baseWithoutDiscriminator);
      continue;
    }

    if (member.$ref) {
      throw new Error(
        `Discriminator subtype of ${baseName} references unexpected ${member.$ref}; only the base ref is supported.`
      );
    }

    merged = mergeSchemaObjects(merged, member);
  }

  return merged;
}

function discriminatorMappingOf(schema: JSONSchemaDto): Record<string, string> | undefined {
  const mapping = (schema as JSONSchemaDto & { discriminator?: { mapping?: Record<string, string> } }).discriminator
    ?.mapping;

  return mapping && Object.keys(mapping).length > 0 ? mapping : undefined;
}

/**
 * Meta often attaches `discriminator.mapping` without a corresponding `oneOf`/`anyOf`. Expand every
 * mapping-only base into `anyOf` of its mapped subtypes so `template.components[].parameters` (and
 * peers) stay typed. Bases that already expose a composition (`Message`) are left for later steps.
 */
function expandDiscriminatorMappings(definitions: SchemaMap): SchemaMap {
  const next = { ...definitions };
  let expansions = 0;

  for (const [baseName, base] of Object.entries(definitions)) {
    const mapping = discriminatorMappingOf(base);
    if (!mapping || Array.isArray(base.oneOf) || Array.isArray(base.anyOf)) {
      continue;
    }

    const { discriminator: _dropped, ...baseWithoutDiscriminator } = base as JSONSchemaDto & {
      discriminator?: unknown;
    };

    for (const mappedRef of Object.values(mapping)) {
      const subtypeName = definitionKeyOf(mappedRef);
      const subtype = next[subtypeName];
      if (!subtype) {
        throw new Error(`Discriminator mapping on ${baseName} points at missing ${subtypeName}.`);
      }

      next[subtypeName] = materializeDiscriminatorSubtype(subtype, baseName, baseWithoutDiscriminator);
    }

    next[baseName] = {
      anyOf: Object.values(mapping).map((mappedRef) => ({ $ref: toDefinitionsRef(mappedRef) })),
    };
    expansions += 1;
  }

  if (expansions === 0) {
    throw new Error('Expected at least one mapping-only discriminator base to expand.');
  }

  return next;
}

function flattenAllOfNode(node: JSONSchemaDto, definitions: SchemaMap, stack: Set<string>): JSONSchemaDto {
  if (!Array.isArray(node.allOf)) {
    return node;
  }

  let merged: JSONSchemaDto = {};
  for (const member of node.allOf) {
    if (typeof member === 'boolean') {
      throw new Error('Boolean allOf members are not supported in the WhatsApp OpenAPI closure.');
    }

    let resolved = member;
    if (member.$ref) {
      const name = definitionKeyOf(member.$ref);
      if (stack.has(name)) {
        throw new Error(`Cycle while flattening allOf through ${name}.`);
      }
      stack.add(name);
      resolved = flattenAllOfNode(cloneJson(resolveRef(definitions, member.$ref)), definitions, stack);
      stack.delete(name);
    } else {
      resolved = flattenAllOfNode(member, definitions, stack);
    }

    merged = mergeSchemaObjects(merged, resolved);
  }

  const { allOf: _composition, ...siblings } = node;

  return mergeSchemaObjects(merged, siblings);
}

/** Merge every `allOf` so `additionalProperties: false` on one branch cannot reject sibling keys. */
function flattenAllOf(definitions: SchemaMap): SchemaMap {
  const next: SchemaMap = {};

  for (const [name, schema] of Object.entries(definitions)) {
    const withFlattenedChildren = mapSchemaNodes(schema, (node) => {
      if (!Array.isArray(node.allOf)) {
        return node;
      }

      return flattenAllOfNode(node as JSONSchemaDto, definitions, new Set([name])) as SchemaNode;
    }) as JSONSchemaDto;

    next[name] = withFlattenedChildren;
  }

  return next;
}

function assertMessageVariantShape(
  variantName: string,
  variant: JSONSchemaDto
): { typeEnum: string; payloadKey: string; payloadSchema: JSONSchemaDefinition } {
  const properties = variant.properties;
  if (!properties) {
    throw new Error(`Message variant ${variantName} has no properties after allOf flattening.`);
  }

  const typeSchema = properties.type;
  if (!isSchemaNode(typeSchema) || !Array.isArray(typeSchema.enum) || typeSchema.enum.length !== 1) {
    throw new Error(`Message variant ${variantName} must declare a singleton type enum.`);
  }

  const typeEnum = typeSchema.enum[0];
  if (typeof typeEnum !== 'string') {
    throw new Error(`Message variant ${variantName} type enum must be a string.`);
  }

  const baseKeys = new Set<string>([...NON_OVERRIDABLE_WHATSAPP_KEYS, 'recipient_type', 'type', 'context']);
  const payloadKeys = Object.keys(properties).filter((key) => !baseKeys.has(key));
  if (payloadKeys.length !== 1) {
    throw new Error(
      `Message variant ${variantName} must be base + exactly one payload key; found [${payloadKeys.join(', ')}].`
    );
  }

  const [payloadKey] = payloadKeys;
  if (payloadKey !== typeEnum) {
    throw new Error(
      `Message variant ${variantName}: payload key \`${payloadKey}\` does not match type enum \`${typeEnum}\`.`
    );
  }

  const payloadSchema = properties[payloadKey];
  if (payloadSchema === undefined) {
    throw new Error(`Message variant ${variantName} is missing payload schema for \`${payloadKey}\`.`);
  }

  return { typeEnum, payloadKey, payloadSchema };
}

function assertMessageOneOfMatchesDiscriminator(message: JSONSchemaDto): void {
  const mapping = discriminatorMappingOf(message);
  if (!mapping || !Array.isArray(message.oneOf)) {
    throw new Error('Message must expose both oneOf and discriminator.mapping before flattening.');
  }

  const oneOfNames = message.oneOf.map((member) => {
    if (typeof member === 'boolean' || !member.$ref) {
      throw new Error('Each Message oneOf member must be a $ref to a variant schema.');
    }

    return definitionKeyOf(member.$ref);
  });
  const mappingNames = Object.values(mapping)
    .map((ref) => definitionKeyOf(ref))
    .sort();
  const sortedOneOf = [...oneOfNames].sort();

  if (JSON.stringify(sortedOneOf) !== JSON.stringify(mappingNames)) {
    throw new Error(
      `Message oneOf and discriminator.mapping disagree.\noneOf: ${sortedOneOf.join(', ')}\nmapping: ${mappingNames.join(', ')}`
    );
  }
}

/**
 * Derive a flat object root from Message's oneOf: lift each payload key, union `type` enums, and
 * keep shared overridable base fields (`recipient_type`, `context`). Routing keys are dropped.
 */
function flattenMessageUnion(definitions: SchemaMap): JSONSchemaDto {
  const message = definitions.Message;
  if (!message || !Array.isArray(message.oneOf) || message.oneOf.length === 0) {
    throw new Error('Message schema must be a non-empty oneOf of message variants.');
  }

  assertMessageOneOfMatchesDiscriminator(message);

  const properties: Record<string, JSONSchemaDefinition> = {};
  const typeEnums: string[] = [];

  for (const member of message.oneOf) {
    if (typeof member === 'boolean' || !member.$ref) {
      throw new Error('Each Message oneOf member must be a $ref to a variant schema.');
    }

    const variantName = definitionKeyOf(member.$ref);
    const variant = definitions[variantName];
    if (!variant) {
      throw new Error(`Message oneOf references missing variant ${variantName}.`);
    }

    const { typeEnum, payloadKey, payloadSchema } = assertMessageVariantShape(variantName, variant);
    typeEnums.push(typeEnum);
    properties[payloadKey] = payloadSchema;

    const recipientType = variant.properties?.recipient_type;
    if (recipientType !== undefined) {
      properties.recipient_type = recipientType;
    }

    const context = variant.properties?.context;
    if (context !== undefined) {
      properties.context = context;
    }
  }

  properties.type = {
    type: 'string',
    description: 'The type of message',
    enum: typeEnums,
  };

  const sortedProperties = Object.fromEntries(
    Object.keys(properties)
      .sort()
      .map((key) => {
        const property = properties[key];
        if (property === undefined) {
          throw new Error(`Missing property schema for \`${key}\` while sorting the flat root.`);
        }

        return [key, property];
      })
  );

  const { Message: _message, ...remainingDefinitions } = definitions;

  return {
    type: 'object',
    additionalProperties: false,
    properties: sortedProperties,
    definitions: remainingDefinitions,
  };
}

function assertRoutingKeysAreAbsent(schema: JSONSchemaDto): void {
  for (const key of NON_OVERRIDABLE_WHATSAPP_KEYS) {
    if (schema.properties?.[key] !== undefined) {
      throw new Error(`\`${key}\` must not be overridable — it is resolved from subscriber routing.`);
    }
  }
}

function isCompositionWrapper(node: SchemaNode): boolean {
  return Array.isArray(node.anyOf) || Array.isArray(node.oneOf) || Array.isArray(node.allOf);
}

/** True when `path` points at `…flow_action_payload.properties.data` (OpenAPI property nesting). */
function pathMatchesFreeFormFlowData(path: readonly string[]): boolean {
  const [parent, leaf] = FREE_FORM_FLOW_DATA_PATH;
  const pathLen = path.length;
  if (pathLen < 3) {
    return false;
  }

  return path[pathLen - 3] === parent && path[pathLen - 2] === 'properties' && path[pathLen - 1] === leaf;
}

/**
 * Close every object that owns `properties`, except composition wrappers and the allowlisted Flow
 * `data` map. Throws if the allowlisted path is never seen.
 */
function closeObjects(schema: JSONSchemaDto): JSONSchemaDto {
  let freeFormHits = 0;

  function visit(value: unknown, path: string[]): unknown {
    if (Array.isArray(value)) {
      return value.map((entry, index) => visit(entry, [...path, String(index)]));
    }

    if (!isSchemaNode(value)) {
      return value;
    }

    const next: SchemaNode = {};
    for (const [key, child] of Object.entries(value)) {
      next[key] = visit(child, [...path, key]);
    }

    if (pathMatchesFreeFormFlowData(path)) {
      freeFormHits += 1;

      return { ...next, type: next.type ?? 'object', additionalProperties: true };
    }

    // Composition wrappers and non-object nodes stay untouched. Bare `type: object` nodes without
    // `properties` are closed too so typos cannot slip through open maps by accident.
    if (isCompositionWrapper(next)) {
      return next;
    }

    if (isSchemaNode(next.properties) || next.type === 'object') {
      return { ...next, additionalProperties: false };
    }

    return next;
  }

  const closed = visit(schema, []) as JSONSchemaDto;
  if (freeFormHits === 0) {
    throw new Error(
      `Free-form Flow data path (${FREE_FORM_FLOW_DATA_PATH.join('.')}) was not found while closing objects.`
    );
  }

  return closed;
}

function patchMediaObjectDefinition(mediaObject: JSONSchemaDto): JSONSchemaDto {
  if (!Array.isArray(mediaObject.oneOf) || mediaObject.oneOf.length !== 2) {
    throw new Error('MediaObject patch expected a two-branch oneOf (id | link).');
  }

  const branches = mediaObject.oneOf.map((branch) => {
    if (typeof branch === 'boolean' || !isSchemaNode(branch.properties)) {
      throw new Error('MediaObject patch expected object branches with properties.');
    }

    const props = branch.properties as Record<string, JSONSchemaDefinition>;
    const hasId = props.id !== undefined;
    const hasLink = props.link !== undefined;
    if (!hasId && !hasLink) {
      throw new Error('MediaObject patch could not recognize an id/link branch.');
    }

    return {
      ...branch,
      properties: {
        ...props,
        caption: {
          type: 'string' as const,
          description: 'Describes the specified media for document, image, or video messages.',
        },
        filename: {
          type: 'string' as const,
          description: 'Describes the filename for the specific document. Only for document messages.',
        },
      },
    } satisfies JSONSchemaDto;
  });

  return { ...mediaObject, oneOf: branches };
}

function applySpecPatches(schema: JSONSchemaDto): JSONSchemaDto {
  let indexPatternHits = 0;
  const definitions = { ...(schema.definitions ?? {}) };
  const mediaObject = definitions.MediaObject;
  if (mediaObject === undefined || typeof mediaObject === 'boolean') {
    throw new Error('Spec patch target missing: definitions.MediaObject.');
  }

  definitions.MediaObject = patchMediaObjectDefinition(mediaObject);

  const withMediaPatch = { ...schema, definitions };
  const patched = mapSchemaNodes(withMediaPatch, (node) => {
    if (node.pattern !== BROKEN_TEMPLATE_INDEX_PATTERN) {
      return node;
    }

    indexPatternHits += 1;

    return { ...node, pattern: FIXED_TEMPLATE_INDEX_PATTERN };
  }) as JSONSchemaDto;

  if (indexPatternHits === 0) {
    throw new Error(
      `Spec patch target missing: pattern ${BROKEN_TEMPLATE_INDEX_PATTERN} was not found on TemplateComponent index.`
    );
  }

  return patched;
}

function normalizeSchemaKeywords(schema: JSONSchemaDto): JSONSchemaDto {
  return mapSchemaNodes(schema, (node) => {
    const next = { ...node };
    delete next.example;
    delete next.discriminator;
    delete next.default;
    delete next.deprecated;

    if (next.format === 'url') {
      next.format = 'uri';
    }

    return next;
  }) as JSONSchemaDto;
}

function makeEveryTopLevelKeyOptional(schema: JSONSchemaDto): JSONSchemaDto {
  const { required: _dropped, ...rest } = schema;

  return rest;
}

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

    if (!isSchemaNode(value)) {
      return;
    }

    if (typeof value.$ref === 'string') {
      referenced.add(definitionKeyOf(value.$ref));
    }

    for (const child of Object.values(value)) {
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

export function buildWhatsappOverrideSchemas(): {
  schema: JSONSchemaDto;
  liquidTolerantSchema: JSONSchemaDto;
} {
  const definitions = loadVendorDefinitions();
  const expanded = expandDiscriminatorMappings(definitions);
  const flattenedDefs = flattenAllOf(expanded);
  const flatRoot = flattenMessageUnion(flattenedDefs);

  assertRoutingKeysAreAbsent(flatRoot);

  const schema = [
    closeObjects,
    applySpecPatches,
    normalizeSchemaKeywords,
    makeEveryTopLevelKeyOptional,
    pruneUnreferencedDefinitions,
  ].reduce<JSONSchemaDto>((current, step) => step(current), flatRoot);

  if (!schema.properties || Object.keys(schema.properties).length === 0) {
    throw new Error('Generated WhatsApp override schema has no properties.');
  }

  return { schema, liquidTolerantSchema: toLiquidTolerantSchema(schema) };
}

function renderModule(exportName: string, schema: JSONSchemaDto, note: string): string {
  return `// Generated by \`${GENERATE_COMMAND}\` from \`scripts/vendor/whatsapp-messages.openapi.json\`.
// Do not edit by hand — \`scripts/whatsapp-override.drift.spec.ts\` fails when this file and the
// vendored Meta OpenAPI Message closure disagree.
// ${note}
import type { JSONSchemaDto } from '../../../../dto/workflows/json-schema-dto';

export const ${exportName}: JSONSchemaDto = ${JSON.stringify(schema, null, 2)};
`;
}

function main(): void {
  const { schema, liquidTolerantSchema } = buildWhatsappOverrideSchemas();

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(
    join(outputDir, 'whatsapp-override.generated.ts'),
    renderModule(
      'whatsappOverrideJsonSchema',
      schema,
      'Flat Cloud API Message fields minus the routing keys Novu owns.'
    )
  );
  writeFileSync(
    join(outputDir, 'whatsapp-override.liquid-tolerant.generated.ts'),
    renderModule(
      'whatsappOverrideLiquidTolerantJsonSchema',
      liquidTolerantSchema,
      'Liquid-tolerant derivation of the schema above, used to validate stored (uncompiled) overrides.'
    )
  );

  process.stdout.write(`Wrote WhatsApp override schemas to ${outputDir}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
