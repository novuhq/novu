import { Completion } from '@codemirror/autocomplete';
import type { JSONSchemaDefinition } from '@novu/shared';
import { JSONSchema7 } from 'json-schema';
import { isAllowedAlias } from '@/components/maily/repeat-block-aliases';
import {
  DIGEST_VARIABLES,
  DIGEST_VARIABLES_ENUM,
  getDynamicDigestVariable,
} from '../components/variable/utils/digest-variables';
import { isNamespaceOnlyVariable } from './liquid';

function normalizeArrayNotation(path: string): string {
  return path.replace(/\[(\d+)\]/g, '.$1');
}

export interface LiquidVariable {
  type?: 'variable' | 'digest' | 'new-variable' | 'local';
  name: string;
  boost?: number;
  info?: Completion['info'];
  displayLabel?: string;
  aliasFor?: string | null;
  isNewSuggestion?: boolean;
}

export type FieldDataType = 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'array' | 'object';

export interface EnhancedLiquidVariable extends LiquidVariable {
  dataType: FieldDataType;
  format?: string;
  inputType?: string;
}

export type IsAllowedVariable = (variable: LiquidVariable) => boolean;
export type IsArbitraryNamespace = (path: string) => boolean;

export interface ParsedVariables {
  primitives: LiquidVariable[];
  arrays: LiquidVariable[];
  variables: LiquidVariable[];
  namespaces: LiquidVariable[];
  isAllowedVariable: IsAllowedVariable;
}

export interface EnhancedParsedVariables extends ParsedVariables {
  enhancedVariables: EnhancedLiquidVariable[];
}

function mapJsonSchemaTypeToFieldType(schemaProperty: JSONSchemaDefinition | JSONSchema7): FieldDataType {
  if (typeof schemaProperty === 'boolean') return 'string';

  const { type, format } = schemaProperty;

  switch (type) {
    case 'string':
      if (format === 'date') return 'date';
      if (format === 'date-time') return 'datetime';
      return 'string';
    case 'number':
    case 'integer':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'array':
      return 'array';
    case 'object':
      return 'object';
    default:
      return 'string';
  }
}

function getInputTypeFromSchema(schemaProperty: JSONSchemaDefinition | JSONSchema7): string {
  if (typeof schemaProperty === 'boolean') return 'text';

  const { type, format } = schemaProperty;

  switch (type) {
    case 'number':
    case 'integer':
      return 'number';
    case 'string':
      if (format === 'date') return 'date';
      if (format === 'date-time') return 'datetime-local';
      if (format === 'email') return 'email';
      return 'text';
    default:
      return 'text';
  }
}

export function parseStepVariables(
  schema: JSONSchemaDefinition | JSONSchema7,
  { digestStepId, isPayloadSchemaEnabled }: { digestStepId?: string; isPayloadSchemaEnabled?: boolean }
): EnhancedParsedVariables {
  const result: ParsedVariables = {
    primitives: [],
    arrays: [],
    variables: [],
    namespaces: [],
    isAllowedVariable: () => false,
  };

  const enhancedVariables: EnhancedLiquidVariable[] = [];

  function extractProperties(obj: JSONSchemaDefinition | JSONSchema7, path = ''): void {
    if (typeof obj === 'boolean') return;

    if (obj.type === 'object') {
      if (!obj.properties) return;

      for (const [key, value] of Object.entries(obj.properties)) {
        const fullPath = path ? `${path}.${key}` : key;

        if (typeof value === 'object') {
          if (value.type === 'array') {
            result.arrays.push({ name: fullPath });
            enhancedVariables.push({
              name: fullPath,
              dataType: 'array',
            });

            if (value.properties) {
              extractProperties({ type: 'object', properties: value.properties }, fullPath);
            }

            if (value.items) {
              const items = Array.isArray(value.items) ? value.items[0] : value.items;
              extractProperties(items, `${fullPath}.0`);
            }
          } else if (value.type === 'object') {
            result.namespaces.push({ name: fullPath });
            enhancedVariables.push({
              name: fullPath,
              dataType: 'object',
            });

            extractProperties(value, fullPath);
          } else if (value.type && ['string', 'number', 'boolean', 'integer'].includes(value.type as string)) {
            const dataType = mapJsonSchemaTypeToFieldType(value);
            const inputType = getInputTypeFromSchema(value);

            result.primitives.push({ name: fullPath });
            enhancedVariables.push({
              name: fullPath,
              dataType,
              inputType,
              format: value.format,
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

  function parseVariablePath(path: string): string[] | null {
    const parts = path
      .split(/\.|\[(\d+)\]/)
      .filter(Boolean)
      .map((part): string | null => {
        const num = parseInt(part);

        if (!isNaN(num)) {
          if (num < 0) return null;
          return num.toString().trim();
        }

        return part.trim();
      });

    return parts.includes(null) ? null : (parts as string[]);
  }

  function isAllowedVariable(variable: LiquidVariable): boolean {
    // Check for namespace-only variables (invalid)
    if (isNamespaceOnlyVariable(variable.name)) {
      return false;
    }

    if (isPayloadSchemaEnabled && variable.name.startsWith('payload.')) {
      return true;
    }

    if (typeof schema === 'boolean') return false;

    // if it has aliasFor, then the name must start with the alias
    if (variable.aliasFor && !isAllowedAlias(variable.name)) {
      return false;
    }

    const pathWithFilters = variable.aliasFor || variable.name;
    const [path] = pathWithFilters.split('|');
    const normalizedPath = normalizeArrayNotation(path);

    if (result.primitives.some((primitive) => normalizeArrayNotation(primitive.name) === normalizedPath)) {
      return true;
    }

    const parts = parseVariablePath(path);
    if (!parts) return false;

    let currentObj: JSONSchemaDefinition | JSONSchema7 = schema;

    // TODO: replace with AJV
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      if (typeof currentObj === 'boolean' || !('type' in currentObj)) return false;

      if (currentObj.type === 'array') {
        if (!currentObj.items) return false;

        const items: JSONSchemaDefinition | JSONSchema7 = Array.isArray(currentObj.items)
          ? currentObj.items[0]
          : currentObj.items;
        if (typeof items === 'boolean') return false;

        currentObj = items;
      }

      if (typeof currentObj === 'boolean' || !('type' in currentObj)) return false;

      if (currentObj.type === 'object') {
        // First check if the property exists in the defined properties
        if (currentObj.properties && part in currentObj.properties) {
          currentObj = currentObj.properties[part];
        }
        // If not found in properties, check if additionalProperties allows it
        else if (currentObj.additionalProperties) {
          if (typeof currentObj.additionalProperties === 'object') {
            // additionalProperties is a schema object
            currentObj = currentObj.additionalProperties;
          } else if (currentObj.additionalProperties === true) {
            // additionalProperties: true means any property is allowed
            // Since we don't know the schema of the property, we allow the rest of the path
            return true;
          } else {
            return false;
          }
        }
        // If neither properties nor additionalProperties allow it, it's invalid
        else {
          return false;
        }
      } else {
        return false;
      }
    }

    return true;
  }

  if (digestStepId) {
    const digestVariables = DIGEST_VARIABLES.map((variable) => {
      const { label: displayLabel, value } = getDynamicDigestVariable({
        digestStepName: digestStepId,
        type: variable.name as DIGEST_VARIABLES_ENUM,
      });

      return {
        ...variable,
        name: value,
        displayLabel,
        dataType: 'string' as FieldDataType,
        inputType: 'text',
      };
    });

    enhancedVariables.unshift(...digestVariables);
  }

  return {
    ...result,

    variables: digestStepId
      ? [
          ...DIGEST_VARIABLES.map((variable) => {
            const { label: displayLabel, value } = getDynamicDigestVariable({
              digestStepName: digestStepId,
              type: variable.name as DIGEST_VARIABLES_ENUM,
            });

            return {
              ...variable,
              name: value,
              displayLabel,
            };
          }),
          ...result.primitives,
          ...result.arrays,
          ...result.namespaces,
        ]
      : [...result.primitives, ...result.arrays, ...result.namespaces],

    isAllowedVariable,
    enhancedVariables,
  };
}
