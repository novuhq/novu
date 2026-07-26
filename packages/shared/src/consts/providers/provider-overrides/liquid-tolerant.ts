import type { JSONSchemaDefinition, JSONSchemaDto } from '../../../dto/workflows/json-schema-dto';

/** Matches the opening delimiter of a Liquid output (`{{`) or tag (`{%`). */
export const LIQUID_TEMPLATE_PATTERN = '\\{\\{|\\{%';

const liquidStringSchema: JSONSchemaDto = { type: 'string', pattern: LIQUID_TEMPLATE_PATTERN };

function acceptsAnyString(schema: JSONSchemaDto): boolean {
  // Every definition is rewritten, so a reference already resolves to a tolerant schema.
  if (schema.$ref !== undefined) {
    return true;
  }

  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  if (!types.includes('string')) {
    return false;
  }

  // A template is longer and shaped differently than the value it renders to, so any constraint
  // beyond "is a string" — including a length cap like Opsgenie's 50-character tags — would
  // reject a legitimate template.
  return (
    schema.enum === undefined &&
    schema.const === undefined &&
    schema.pattern === undefined &&
    schema.format === undefined &&
    schema.maxLength === undefined &&
    schema.minLength === undefined
  );
}

function transformDefinition(definition: JSONSchemaDefinition): JSONSchemaDefinition {
  if (typeof definition === 'boolean') {
    return definition;
  }

  return toLiquidTolerantSchema(definition);
}

function transformRecord(record: Readonly<Record<string, JSONSchemaDefinition>>): Record<string, JSONSchemaDefinition> {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, transformDefinition(value)]));
}

/**
 * Composition members are rewritten without their own template branch: the enclosing
 * composition node already carries one, and a per-member branch would make a template
 * string satisfy several `oneOf` members at once.
 */
function transformComposition(members: JSONSchemaDefinition[]): JSONSchemaDefinition[] {
  return members.map((member) => (typeof member === 'boolean' ? member : transformChildren(member)));
}

function transformChildren(schema: JSONSchemaDto): JSONSchemaDto {
  const next: JSONSchemaDto = { ...schema };

  if (next.anyOf) {
    next.anyOf = transformComposition(next.anyOf);
  }

  if (next.oneOf) {
    next.oneOf = transformComposition(next.oneOf);
  }

  if (next.allOf) {
    next.allOf = transformComposition(next.allOf);
  }

  if (next.properties) {
    next.properties = transformRecord(next.properties);
  }

  if (next.patternProperties) {
    next.patternProperties = transformRecord(next.patternProperties);
  }

  if (next.definitions) {
    next.definitions = transformRecord(next.definitions);
  }

  if (next.additionalProperties !== undefined) {
    next.additionalProperties = transformDefinition(next.additionalProperties);
  }

  if (Array.isArray(next.items)) {
    next.items = next.items.map(transformDefinition);
  } else if (next.items !== undefined) {
    next.items = transformDefinition(next.items);
  }

  return next;
}

/**
 * Overrides are persisted with Liquid still in them and only compiled at send time, so the raw
 * stored value has to validate against a schema that also accepts a template wherever a concrete
 * value is expected. `additionalProperties: false` is preserved throughout: catching a typo'd key
 * is the reason deep validation is worth doing at all.
 */
export function toLiquidTolerantSchema(schema: JSONSchemaDto): JSONSchemaDto {
  if (acceptsAnyString(schema)) {
    return schema;
  }

  // `$ref` pointers are absolute (`#/definitions/...`), so definitions are hoisted onto the
  // wrapper rather than buried inside its first branch.
  const { definitions, ...rest } = transformChildren(schema);
  const wrapped: JSONSchemaDto = { anyOf: [rest, { ...liquidStringSchema }] };

  return definitions === undefined ? wrapped : { definitions, ...wrapped };
}
