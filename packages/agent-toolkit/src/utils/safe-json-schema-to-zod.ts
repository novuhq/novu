import { type ZodTypeAny, z } from 'zod';

type JsonSchema = Record<string, unknown>;

const SUPPORTED_STRING_FORMATS = new Set(['email', 'uri', 'uuid', 'date-time', 'date', 'time']);

export function safeJsonSchemaToZod(schema: JsonSchema): ZodTypeAny {
  return buildSchema(schema, schema);
}

function buildSchema(schema: JsonSchema, root: JsonSchema, refStack: Set<string> = new Set()): ZodTypeAny {
  if ('$ref' in schema && typeof schema.$ref === 'string') {
    if (refStack.has(schema.$ref)) {
      return fallbackSchema();
    }

    const resolved = resolveRef(schema.$ref, root);

    if (!resolved) {
      return fallbackSchema();
    }

    refStack.add(schema.$ref);

    const resolvedSchema = buildSchema(resolved, root, refStack);

    refStack.delete(schema.$ref);

    return resolvedSchema;
  }

  if (Array.isArray(schema.allOf)) {
    return buildAllOf(schema.allOf, root, refStack);
  }

  if (Array.isArray(schema.anyOf)) {
    return buildUnion(schema.anyOf, root, refStack);
  }

  if (Array.isArray(schema.oneOf)) {
    return buildUnion(schema.oneOf, root, refStack);
  }

  if (Array.isArray(schema.enum)) {
    return buildEnum(schema.enum);
  }

  if ('const' in schema) {
    return z.literal(schema.const as never);
  }

  const type = schema.type;

  if (Array.isArray(type)) {
    const nonNullTypes = type.filter((value) => value !== 'null');

    if (nonNullTypes.length === 0) {
      return z.null();
    }

    const variants = nonNullTypes.map((value) => buildSchema({ ...schema, type: value }, root, refStack));
    const unionSchema =
      variants.length === 1 ? variants[0] : z.union(variants as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]]);

    if (type.includes('null')) {
      return unionSchema.nullable();
    }

    return unionSchema;
  }

  if (type === 'object' || schema.properties) {
    return buildObject(schema, root, refStack);
  }

  if (type === 'array') {
    return buildArray(schema, root, refStack);
  }

  if (type === 'string') {
    return buildString(schema);
  }

  if (type === 'number' || type === 'integer') {
    return buildNumber(schema, type === 'integer');
  }

  if (type === 'boolean') {
    return applyDescription(z.boolean(), schema);
  }

  if (type === 'null') {
    return applyDescription(z.null(), schema);
  }

  return fallbackSchema();
}

function resolveRef(ref: string, root: JsonSchema): JsonSchema | null {
  if (!ref.startsWith('#/')) {
    return null;
  }

  const parts = ref.slice(2).split('/');
  let current: unknown = root;

  for (const part of parts) {
    const key = part.replace(/~1/g, '/').replace(/~0/g, '~');

    if (typeof current !== 'object' || current === null) {
      return null;
    }

    const record = current as Record<string, unknown>;

    if (!(key in record)) {
      return null;
    }

    current = record[key];
  }

  if (typeof current === 'object' && current !== null) {
    return current as JsonSchema;
  }

  return null;
}

function buildAllOf(schemas: unknown[], root: JsonSchema, refStack: Set<string>): ZodTypeAny {
  const zodSchemas = schemas
    .filter((value): value is JsonSchema => typeof value === 'object' && value !== null)
    .map((value) => buildSchema(value, root, refStack));

  if (zodSchemas.length === 0) {
    return fallbackSchema();
  }

  return zodSchemas.reduce((left, right) => z.intersection(left, right));
}

function buildUnion(schemas: unknown[], root: JsonSchema, refStack: Set<string>): ZodTypeAny {
  const zodSchemas = schemas
    .filter((value): value is JsonSchema => typeof value === 'object' && value !== null)
    .map((value) => buildSchema(value, root, refStack));

  if (zodSchemas.length === 0) {
    return fallbackSchema();
  }

  if (zodSchemas.length === 1) {
    return zodSchemas[0];
  }

  return z.union(zodSchemas as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]]);
}

function buildEnum(values: unknown[]): ZodTypeAny {
  const literals = values.map((value) => z.literal(value as never));

  if (literals.length === 0) {
    return fallbackSchema();
  }

  if (literals.length === 1) {
    return literals[0];
  }

  return z.union(literals as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]]);
}

function buildObject(schema: JsonSchema, root: JsonSchema, refStack: Set<string>): ZodTypeAny {
  const properties = (schema.properties as Record<string, JsonSchema> | undefined) ?? {};
  const required = new Set(Array.isArray(schema.required) ? schema.required : []);
  const shape: Record<string, ZodTypeAny> = {};

  for (const [key, propertySchema] of Object.entries(properties)) {
    let property = buildSchema(propertySchema, root, refStack);

    if (!required.has(key)) {
      property = property.optional();
    }

    shape[key] = property;
  }

  let objectSchema: ZodTypeAny = z.object(shape);

  if (schema.additionalProperties === false) {
    objectSchema = (objectSchema as z.ZodObject<z.ZodRawShape>).strict();
  } else if (typeof schema.additionalProperties === 'object' && schema.additionalProperties !== null) {
    objectSchema = (objectSchema as z.ZodObject<z.ZodRawShape>).catchall(
      buildSchema(schema.additionalProperties as JsonSchema, root, refStack)
    );
  }

  return applyDescription(objectSchema, schema);
}

function buildArray(schema: JsonSchema, root: JsonSchema, refStack: Set<string>): ZodTypeAny {
  const items = schema.items;
  const isTuple = Array.isArray(items);

  let arraySchema: ZodTypeAny;

  if (isTuple) {
    const tupleItems = items.map((item) => buildTupleItemSchema(item, root, refStack));

    if (tupleItems.length === 0) {
      arraySchema = z.array(z.unknown());
    } else {
      arraySchema = buildTupleArraySchema(tupleItems, schema, root, refStack);
    }
  } else if (typeof items === 'object' && items !== null) {
    arraySchema = z.array(buildSchema(items as JsonSchema, root, refStack));
  } else if (items === false) {
    arraySchema = z.array(z.never());
  } else {
    arraySchema = z.array(z.unknown());
  }

  arraySchema = applyArrayLengthConstraints(arraySchema, schema);

  return applyDescription(arraySchema, schema);
}

function buildTupleItemSchema(item: unknown, root: JsonSchema, refStack: Set<string>): ZodTypeAny {
  if (item === false) {
    return z.never();
  }

  if (item === true) {
    return z.unknown();
  }

  if (typeof item === 'object' && item !== null) {
    return buildSchema(item as JsonSchema, root, refStack);
  }

  return z.unknown();
}

function buildTupleArraySchema(
  tupleItems: ZodTypeAny[],
  schema: JsonSchema,
  root: JsonSchema,
  refStack: Set<string>
): ZodTypeAny {
  const prefixLength = tupleItems.length;
  const additionalItemsSchema =
    schema.additionalItems === false
      ? null
      : typeof schema.additionalItems === 'object' && schema.additionalItems !== null
        ? buildSchema(schema.additionalItems as JsonSchema, root, refStack)
        : z.unknown();

  return z.array(z.unknown()).superRefine((value, ctx) => {
    if (!Array.isArray(value)) {
      return;
    }

    if (schema.additionalItems === false && value.length > prefixLength) {
      ctx.addIssue({
        code: 'custom',
        message: `Array must contain at most ${prefixLength} element(s)`,
      });
    }

    for (let index = 0; index < value.length && index < prefixLength; index++) {
      const result = tupleItems[index].safeParse(value[index]);

      if (!result.success) {
        ctx.addIssue({
          code: 'custom',
          message: `Invalid element at index ${index}`,
        });
      }
    }

    if (additionalItemsSchema) {
      for (let index = prefixLength; index < value.length; index++) {
        const result = additionalItemsSchema.safeParse(value[index]);

        if (!result.success) {
          ctx.addIssue({
            code: 'custom',
            message: `Invalid element at index ${index}`,
          });
        }
      }
    }
  });
}

function applyArrayLengthConstraints(arraySchema: ZodTypeAny, schema: JsonSchema): ZodTypeAny {
  const minItems = typeof schema.minItems === 'number' ? schema.minItems : undefined;
  const maxItems = typeof schema.maxItems === 'number' ? schema.maxItems : undefined;

  if (minItems === undefined && maxItems === undefined) {
    return arraySchema;
  }

  return arraySchema.superRefine((value, ctx) => {
    if (!Array.isArray(value)) {
      return;
    }

    if (minItems !== undefined && value.length < minItems) {
      ctx.addIssue({
        code: 'too_small',
        origin: 'array',
        minimum: minItems,
        inclusive: true,
        message: `Array must contain at least ${minItems} element(s)`,
      });
    }

    if (maxItems !== undefined && value.length > maxItems) {
      ctx.addIssue({
        code: 'too_big',
        origin: 'array',
        maximum: maxItems,
        inclusive: true,
        message: `Array must contain at most ${maxItems} element(s)`,
      });
    }
  });
}

function buildString(schema: JsonSchema): ZodTypeAny {
  let stringSchema: ZodTypeAny = z.string();

  if (typeof schema.minLength === 'number') {
    stringSchema = (stringSchema as z.ZodString).min(schema.minLength);
  }

  if (typeof schema.maxLength === 'number') {
    stringSchema = (stringSchema as z.ZodString).max(schema.maxLength);
  }

  if (typeof schema.pattern === 'string') {
    try {
      stringSchema = (stringSchema as z.ZodString).regex(new RegExp(schema.pattern));
    } catch {
      // Keep an unconstrained string when the workflow pattern is invalid.
    }
  }

  if (typeof schema.format === 'string' && SUPPORTED_STRING_FORMATS.has(schema.format)) {
    stringSchema = applyStringFormat(stringSchema as z.ZodString, schema.format);
  }

  return applyDescription(stringSchema, schema);
}

function applyStringFormat(stringSchema: z.ZodString, format: string): z.ZodString {
  switch (format) {
    case 'email':
      return stringSchema.email();
    case 'uri':
      return stringSchema.url();
    case 'uuid':
      return stringSchema.uuid();
    case 'date-time':
      return stringSchema.datetime();
    case 'date':
      return stringSchema.date();
    case 'time':
      return stringSchema.time();
    default: {
      const _exhaustive: never = format;

      return stringSchema;
    }
  }
}

function buildNumber(schema: JsonSchema, isInteger: boolean): ZodTypeAny {
  let numberSchema: ZodTypeAny = isInteger ? z.number().int() : z.number();

  if (typeof schema.minimum === 'number') {
    numberSchema = (numberSchema as z.ZodNumber).min(schema.minimum);
  }

  if (typeof schema.maximum === 'number') {
    numberSchema = (numberSchema as z.ZodNumber).max(schema.maximum);
  }

  return applyDescription(numberSchema, schema);
}

function applyDescription(schema: ZodTypeAny, jsonSchema: JsonSchema): ZodTypeAny {
  if (typeof jsonSchema.description === 'string' && jsonSchema.description.length > 0) {
    return schema.describe(jsonSchema.description);
  }

  return schema;
}

function fallbackSchema(): ZodTypeAny {
  return z.record(z.string(), z.unknown());
}
