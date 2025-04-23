/* eslint-disable no-param-reassign */
import difference from 'lodash/difference';
import isArray from 'lodash/isArray';
import isObject from 'lodash/isObject';
import reduce from 'lodash/reduce';
import set from 'lodash/set';
import { JSONSchemaDto } from '../dtos';
import { ArrayVariable } from '../usecases/create-variables-object/create-variables-object.usecase';

export function findMissingKeys(requiredRecord: object, actualRecord: object) {
  const requiredKeys = collectKeys(requiredRecord);
  const actualKeys = collectKeys(actualRecord);

  return difference(requiredKeys, actualKeys);
}

export function collectKeys(obj, prefix = '') {
  return reduce(
    obj,
    (result, value, key) => {
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (isObject(value) && !isArray(value)) {
        result.push(...collectKeys(value, newKey));
      } else {
        result.push(newKey);
      }

      return result;
    },
    []
  );
}

/**
 * Recursively adds missing defaults for properties in a JSON schema object.
 * For properties without defaults, adds interpolated path as the default value.
 * Handles nested objects by recursively processing their properties.
 *
 * @param {Object} schema - The JSON schema object to process
 * @param {string} parentPath - The parent path for building default values (default: 'payload')
 * @returns {Object} The schema with missing defaults added
 *
 * @example
 * const schema = {
 *   properties: {
 *     name: { type: 'string' },
 *     address: {
 *       type: 'object',
 *       properties: {
 *         street: { type: 'string' }
 *       }
 *     }
 *   }
 * };
 *
 * const result = addMissingDefaults(schema);
 * // Result:
 * // {
 * //   properties: {
 * //     name: {
 * //       type: 'string',
 * //       default: '{{payload.name}}'
 * //     },
 * //     address: {
 * //       type: 'object',
 * //       properties: {
 * //         street: {
 * //           type: 'string',
 * //           default: '{{payload.address.street}}'
 * //         }
 * //       }
 * //     }
 * //   }
 * // }
 */
export function mockSchemaDefaults(schema: JSONSchemaDto, parentPath = 'payload', depth = 0): JSONSchemaDto {
  const MAX_DEPTH = 10;

  if (depth >= MAX_DEPTH) {
    return schema;
  }

  if (schema.properties) {
    Object.entries(schema.properties).forEach(([key, value]) => {
      const valueDto = value as JSONSchemaDto;
      if (valueDto.type === 'object') {
        mockSchemaDefaults(valueDto, `${parentPath}.${key}`, depth + 1);
      }

      if (!valueDto.default && valueDto.type !== 'object') {
        valueDto.default = `{{${parentPath}.${key}}}`;
      }
    });
  }

  return schema;
}

/**
 * Converts an array of dot-notation paths into a nested object structure.
 * Each leaf node value will be the original path wrapped in handlebars syntax {{path}}.
 * Handles both object and array paths (using .0. notation for arrays).
 *
 * @example
 * Input: ['user.name', 'user.addresses[0].street']
 * Output: {
 *   user: {
 *     name: '{{user.name}}',
 *     addresses: [
 *       { street: '{{user.addresses[0].street}}' },
 *     ]
 *   }
 * }
 */
export function keysToObject(
  paths: string[],
  arrayVariables?: Array<ArrayVariable>,
  showIfVariablesPaths?: string[]
): Record<string, unknown> {
  const validPaths = paths
    .filter(hasNamespace)
    // remove paths that are a prefix of another path
    .filter((path) => !paths.some((otherPath) => otherPath !== path && otherPath.startsWith(`${path}.`)));

  return buildObjectFromPaths(validPaths, arrayVariables || [], showIfVariablesPaths || []);
}

function hasNamespace(path: string): boolean {
  return path.includes('.');
}

function buildObjectFromPaths(
  paths: string[],
  arrayVariables: Array<ArrayVariable>,
  showIfVariablesPaths?: string[]
): Record<string, unknown> {
  const result = {};

  // Initialize arrays with the correct number of iterations
  arrayVariables.forEach((arrayVariable) => {
    set(result, arrayVariable.path, Array(arrayVariable.iterations).fill({}));
  });

  // Sort paths by number of dots (depth) in ascending order
  const sortedPaths = [...paths].sort((a, b) => (a.match(/\./g) || []).length - (b.match(/\./g) || []).length);

  // Set all other paths
  sortedPaths.forEach((path) => {
    const lastPart = path
      .split('.')
      .pop()
      ?.replace(/\[\d+\]/g, ''); // Remove array indices from the value
    const value = showIfVariablesPaths?.includes(path) ? true : lastPart;

    const arrayParent = arrayVariables.find(
      (arrayVariable) => arrayVariable.path === path || path.startsWith(`${arrayVariable.path}.`)
    );
    if (!arrayParent) {
      set(result, path.replace(/\[\d+\]/g, '[0]'), value);

      return;
    }

    const isDirectArrayPath = arrayParent.path === path;
    const targetPath = isDirectArrayPath ? path : `${arrayParent.path}[0].${path.slice(arrayParent.path.length + 1)}`;

    if (isDirectArrayPath) {
      set(result, targetPath, Array(arrayParent.iterations).fill(value));
    } else {
      set(result, targetPath, value);
    }
  });

  return result;
}

/**
 * Recursively merges common/overlapping object keys from source into target.
 *
 * @example
 * Target: { subscriber: { phone: '{{subscriber.phone}}', name: '{{subscriber.name}}' } }
 * Source: { subscriber: { phone: '123' }, payload: { someone: '{{payload.someone}}' }}
 * Result: { subscriber: { phone: '123', name: '{{subscriber.name}}' } }
 */
export function mergeCommonObjectKeys(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  return Object.entries(target).reduce(
    (merged, [key, targetValue]) => {
      const sourceValue = source[key];

      if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
        merged[key] = Array.from({ length: sourceValue.length }, (_, index) => {
          return sourceValue[index];
        });
      } else if (isObject(targetValue) && isObject(sourceValue)) {
        merged[key] = mergeCommonObjectKeys(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        );
      } else {
        merged[key] = key in source ? sourceValue : targetValue;
      }

      return merged;
    },
    {} as Record<string, unknown>
  );
}
