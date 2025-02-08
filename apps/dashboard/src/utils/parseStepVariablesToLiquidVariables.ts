import type { JSONSchemaDefinition } from '@novu/shared';

export interface LiquidVariable {
  type: 'variable';
  label: string;
}

export interface ParsedVariables {
  primitives: LiquidVariable[];
  arrays: LiquidVariable[];
  namespaces: LiquidVariable[];
}

/**
 * Parse JSON Schema and extract variables for Liquid autocompletion.
 * @param schema - The JSON Schema to parse.
 * @returns An object containing three arrays: primitives, arrays, and namespaces.
 */
export function parseStepVariables(schema: JSONSchemaDefinition): ParsedVariables {
  const result: ParsedVariables = {
    primitives: [],
    arrays: [],
    namespaces: [],
  };

  function extractProperties(obj: JSONSchemaDefinition, path = ''): void {
    if (typeof obj === 'boolean') return;

    if (obj.type === 'object') {
      // Handle object with additionalProperties
      if (obj.additionalProperties === true) {
        result.namespaces.push({
          type: 'variable',
          label: path,
        });
      }

      if (!obj.properties) return;

      for (const [key, value] of Object.entries(obj.properties)) {
        const fullPath = path ? `${path}.${key}` : key;

        if (typeof value === 'object') {
          if (value.type === 'array') {
            result.arrays.push({
              type: 'variable',
              label: fullPath,
            });
            if (value.properties) {
              extractProperties({ type: 'object', properties: value.properties }, fullPath);
            }
            if (value.items) {
              const items = Array.isArray(value.items) ? value.items[0] : value.items;
              extractProperties(items, `${fullPath}[0]`);
            }
          } else if (value.type === 'object') {
            extractProperties(value, fullPath);
          } else if (value.type && ['string', 'number', 'boolean', 'integer'].includes(value.type as string)) {
            result.primitives.push({
              type: 'variable',
              label: fullPath,
            });
          }
        }
      }
    }

    // Handle combinators (allOf, anyOf, oneOf)
    ['allOf', 'anyOf', 'oneOf'].forEach((combiner) => {
      if (Array.isArray(obj[combiner as keyof typeof obj])) {
        for (const subSchema of obj[combiner as keyof typeof obj] as JSONSchemaDefinition[]) {
          extractProperties(subSchema, path);
        }
      }
    });

    // Handle conditional schemas (if/then/else)
    if (obj.if) extractProperties(obj.if, path);
    if (obj.then) extractProperties(obj.then, path);
    if (obj.else) extractProperties(obj.else, path);
  }

  extractProperties(schema);
  return result;
}

export const parseStepVariablesToLiquidVariables = (schema: JSONSchemaDefinition) => {
  const variables = parseStepVariables(schema);
  return [...variables.primitives, ...variables.namespaces];
};
