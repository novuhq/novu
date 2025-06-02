import type { JSONSchema7, JSONSchema7TypeName } from '../json-schema';

// Helper to carry over common/metadata keywords
function carryOverCommonKeywords(originalSchema: JSONSchema7, newSchema: Partial<JSONSchema7>) {
  if (originalSchema.title !== undefined) newSchema.title = originalSchema.title;
  if (originalSchema.description !== undefined) newSchema.description = originalSchema.description;
  if (originalSchema.default !== undefined) newSchema.default = originalSchema.default; // Type compatibility should be ensured by caller or validation
  if (originalSchema.examples !== undefined) newSchema.examples = originalSchema.examples;
  if (originalSchema.$id !== undefined) newSchema.$id = originalSchema.$id;
  if (originalSchema.$schema !== undefined) newSchema.$schema = originalSchema.$schema;

  if (originalSchema.readOnly !== undefined) newSchema.readOnly = originalSchema.readOnly;
  if (originalSchema.writeOnly !== undefined) newSchema.writeOnly = originalSchema.writeOnly;
  // Keep advanced/conditional keywords as they are complex to selectively clear
  if (originalSchema.if !== undefined) newSchema.if = originalSchema.if;
  if (originalSchema.then !== undefined) newSchema.then = originalSchema.then;
  if (originalSchema.else !== undefined) newSchema.else = originalSchema.else;
  if (originalSchema.allOf !== undefined) newSchema.allOf = originalSchema.allOf;
  if (originalSchema.anyOf !== undefined) newSchema.anyOf = originalSchema.anyOf;
  if (originalSchema.oneOf !== undefined) newSchema.oneOf = originalSchema.oneOf;
  if (originalSchema.not !== undefined) newSchema.not = originalSchema.not;
  if (originalSchema.definitions !== undefined) newSchema.definitions = originalSchema.definitions;
  if (originalSchema.$defs !== undefined) newSchema.$defs = originalSchema.$defs;
  if (originalSchema.$ref !== undefined) newSchema.$ref = originalSchema.$ref;
  if (originalSchema.$comment !== undefined) newSchema.$comment = originalSchema.$comment;
  if ((originalSchema as any).deprecated !== undefined)
    (newSchema as any).deprecated = (originalSchema as any).deprecated;
}

export function newProperty(type: JSONSchema7TypeName = 'string'): JSONSchema7 {
  const baseProperty: Partial<JSONSchema7 & { propertyList?: any[] }> = { type };

  if (type === 'object') {
    baseProperty.propertyList = [];
  }

  if (type === 'array') {
    baseProperty.items = { type: 'string' };
  }

  return baseProperty as JSONSchema7;
}

export function ensureObject(schema: JSONSchema7): JSONSchema7 {
  const newSchema: Partial<JSONSchema7 & { propertyList?: any[] }> = { type: 'object' };
  carryOverCommonKeywords(schema, newSchema);

  newSchema.propertyList =
    (schema as any).propertyList && Array.isArray((schema as any).propertyList) ? (schema as any).propertyList : [];
  delete (newSchema as any).properties;

  if (schema.required !== undefined) newSchema.required = schema.required;
  if (schema.additionalProperties !== undefined) newSchema.additionalProperties = schema.additionalProperties;
  if (schema.minProperties !== undefined) newSchema.minProperties = schema.minProperties;
  if (schema.maxProperties !== undefined) newSchema.maxProperties = schema.maxProperties;
  if (schema.patternProperties !== undefined) newSchema.patternProperties = schema.patternProperties;
  return newSchema as JSONSchema7;
}

export function ensureArray(schema: JSONSchema7): JSONSchema7 {
  const newSchema: Partial<JSONSchema7> = { type: 'array' };

  carryOverCommonKeywords(schema, newSchema);

  // Array specific - carry over if present, or initialize
  // If schema.items exists and is a valid schema object or array of schemas, use it.
  // Otherwise, default to a new string item schema.
  if (schema.items && (typeof schema.items === 'object' || Array.isArray(schema.items))) {
    newSchema.items = JSON.parse(JSON.stringify(schema.items)); // Deep clone to avoid shared references
  } else {
    // Default item schema. If items can be complex and use propertyList, this needs to be newProperty('object') or similar
    newSchema.items = { type: 'string' };
  }

  delete (newSchema as any).propertyList;

  if (schema.contains !== undefined) newSchema.contains = schema.contains;
  if (schema.minItems !== undefined) newSchema.minItems = schema.minItems;
  if (schema.maxItems !== undefined) newSchema.maxItems = schema.maxItems;
  if (schema.uniqueItems !== undefined) newSchema.uniqueItems = schema.uniqueItems;
  return newSchema as JSONSchema7;
}

export function ensureString(schema: JSONSchema7): JSONSchema7 {
  const newSchema: Partial<JSONSchema7> = { type: 'string' };
  carryOverCommonKeywords(schema, newSchema);
  if (schema.minLength !== undefined) newSchema.minLength = schema.minLength;
  if (schema.maxLength !== undefined) newSchema.maxLength = schema.maxLength;
  if (schema.pattern !== undefined) newSchema.pattern = schema.pattern;
  if (schema.format !== undefined) newSchema.format = schema.format;

  if (newSchema.default !== undefined && typeof newSchema.default !== 'string') {
    delete newSchema.default;
  }

  delete (newSchema as any).propertyList;
  delete newSchema.items;
  delete newSchema.enum; // String type is not enum by default

  return newSchema as JSONSchema7;
}

export function ensureNumberOrInteger(schema: JSONSchema7, newType: 'number' | 'integer'): JSONSchema7 {
  const newSchema: Partial<JSONSchema7> = { type: newType };
  carryOverCommonKeywords(schema, newSchema);
  if (schema.minimum !== undefined) newSchema.minimum = schema.minimum;
  if (schema.maximum !== undefined) newSchema.maximum = schema.maximum;
  if (schema.exclusiveMinimum !== undefined) newSchema.exclusiveMinimum = schema.exclusiveMinimum;
  if (schema.exclusiveMaximum !== undefined) newSchema.exclusiveMaximum = schema.exclusiveMaximum;
  if (schema.multipleOf !== undefined) newSchema.multipleOf = schema.multipleOf;

  if (newSchema.default !== undefined && typeof newSchema.default !== 'number') {
    delete newSchema.default;
  }

  delete (newSchema as any).propertyList;
  delete newSchema.items;
  delete newSchema.enum;
  return newSchema as JSONSchema7;
}

export function ensureBoolean(schema: JSONSchema7): JSONSchema7 {
  const newSchema: Partial<JSONSchema7> = { type: 'boolean' };
  carryOverCommonKeywords(schema, newSchema);

  if (newSchema.default !== undefined && typeof newSchema.default !== 'boolean') {
    delete newSchema.default;
  }

  delete (newSchema as any).propertyList;
  delete newSchema.items;
  delete newSchema.enum;

  return newSchema as JSONSchema7;
}

export function ensureNull(schema: JSONSchema7): JSONSchema7 {
  const newSchema: Partial<JSONSchema7> = { type: 'null' };
  carryOverCommonKeywords(schema, newSchema);

  if (newSchema.default !== undefined && newSchema.default !== null) {
    newSchema.default = null;
  }

  delete (newSchema as any).propertyList;
  delete newSchema.items;
  delete newSchema.enum;

  return newSchema as JSONSchema7;
}

export function ensureEnum(schema: JSONSchema7): JSONSchema7 {
  const newSchema: Partial<JSONSchema7> = { type: 'string' };
  carryOverCommonKeywords(schema, newSchema);

  if (Array.isArray(schema.enum) && schema.enum.every((val): val is string => typeof val === 'string')) {
    newSchema.enum = schema.enum.length > 0 ? schema.enum : [''];
  } else {
    newSchema.enum = [''];
  }

  if (
    newSchema.default !== undefined &&
    Array.isArray(newSchema.enum) &&
    !newSchema.enum.includes(newSchema.default as string)
  ) {
    delete newSchema.default;
  }

  delete (newSchema as any).propertyList;
  delete newSchema.items;

  return newSchema as JSONSchema7;
}
