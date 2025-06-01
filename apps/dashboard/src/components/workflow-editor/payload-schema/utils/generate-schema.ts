import type { JSONSchema7 } from '@/components/schema-editor/json-schema';

/**
 * Removes internal keys from the payload that shouldn't be part of the schema
 */
export function cleanPayloadData(payload: any): any {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  const cleanPayload = { ...payload };
  // Remove internal Novu keys
  delete cleanPayload.__source;

  return cleanPayload;
}

/**
 * Determines the JSONSchema7 type for a given value
 */
function determineSchemaType(value: unknown): JSONSchema7 {
  if (value === null) {
    return { type: 'null' };
  }

  if (Array.isArray(value)) {
    return {
      type: 'array',
      items: value.length > 0 ? determineSchemaType(value[0]) : { type: 'string' },
    };
  }

  switch (typeof value) {
    case 'string':
      return { type: 'string' };
    case 'number':
      return { type: 'number' };
    case 'boolean':
      return { type: 'boolean' };

    case 'object': {
      const properties: { [key: string]: JSONSchema7 } = {};

      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        properties[key] = determineSchemaType(val);
      }

      return {
        type: 'object',
        properties,
        required: Object.keys(value as Record<string, unknown>),
      };
    }

    default:
      return { type: 'string' };
  }
}

/**
 * Generates a JSONSchema7 from JSON data
 */
export function generateSchemaFromJson(jsonData: any): JSONSchema7 {
  const schema = determineSchemaType(jsonData);

  if (schema.type === 'object') {
    return schema;
  }

  // If the root is not an object, wrap it in a payload property
  return {
    type: 'object',
    properties: {
      payload: schema,
    },
    required: ['payload'],
  };
}

/**
 * Validates if a string contains valid JSON
 */
export function isValidJson(value: string): boolean {
  if (!value.trim()) return false;

  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}
