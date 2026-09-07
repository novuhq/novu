import { JsonSchemaTypeEnum } from '@novu/dal';
import { JSONSchemaDto } from '../dtos/json-schema.dto';

export type LiquidVariable = {
  name: string;
  aliasFor?: string;
};

export type ParsedVariables = {
  primitives: LiquidVariable[];
  arrays: LiquidVariable[];
  namespaces: LiquidVariable[];
};

const MAX_SCHEMA_TRAVERSAL_DEPTH = 10;

/**
 * Parse JSON Schema and extract variables for Liquid autocompletion.
 * @param schema - The JSON Schema to parse.
 * @returns An object containing three arrays: primitives, arrays, and namespaces.
 */
export function parseStepVariables(schema: JSONSchemaDto): ParsedVariables {
  const result: ParsedVariables = {
    primitives: [],
    arrays: [],
    namespaces: [],
  };

  function extractProperties(obj: JSONSchemaDto, path = '', depth = 0): void {
    if (typeof obj === 'boolean' || depth >= MAX_SCHEMA_TRAVERSAL_DEPTH) {
      return;
    }

    if (obj.type === 'object') {
      // Handle object with additionalProperties
      if (obj.additionalProperties === true) {
        result.namespaces.push({
          name: path,
        });
      }

      if (!obj.properties) return;

      for (const [key, value] of Object.entries(obj.properties)) {
        const fullPath = path ? `${path}.${key}` : key;

        if (typeof value === 'object') {
          if (value.type === 'array') {
            result.arrays.push({
              name: fullPath,
            });
            if (value.properties) {
              extractProperties({ type: JsonSchemaTypeEnum.OBJECT, properties: value.properties }, fullPath, depth + 1);
            }
            if (value.items) {
              const items = Array.isArray(value.items) ? value.items[0] : value.items;
              extractProperties(items, `${fullPath}.0`, depth + 1);
            }
          } else if (value.type === 'object') {
            extractProperties(value, fullPath, depth + 1);
          } else if (value.type && ['string', 'number', 'boolean', 'integer'].includes(value.type as string)) {
            result.primitives.push({
              name: fullPath,
            });
          }
        }
      }
    }

    // Handle combinators (allOf, anyOf, oneOf)
    ['allOf', 'anyOf', 'oneOf'].forEach((combiner) => {
      if (Array.isArray(obj[combiner as keyof typeof obj])) {
        for (const subSchema of obj[combiner as keyof typeof obj] as JSONSchemaDto[]) {
          extractProperties(subSchema, path, depth + 1);
        }
      }
    });

    // Handle conditional schemas (if/then/else)
    if (obj.if) extractProperties(obj.if, path, depth + 1);
    if (obj.then) extractProperties(obj.then, path, depth + 1);
    if (obj.else) extractProperties(obj.else, path, depth + 1);
  }

  extractProperties(schema);

  return result;
}
