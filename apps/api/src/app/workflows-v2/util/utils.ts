import difference from 'lodash/difference';
import { mergeWith, isArray, isObject } from 'lodash';

import reduce from 'lodash/reduce';
import set from 'lodash/set';
import { JSONSchemaDto } from '../dtos';
import { ArrayVariable } from '../usecases/create-variables-object/create-variables-object.usecase';
import { DIGEST_EVENTS_VARIABLE_PATTERN } from './template-parser/parser-utils';

export function findMissingKeys(requiredRecord: object, actualRecord: object) {
  const requiredKeys = collectKeys(requiredRecord);
  const actualKeys = collectKeys(actualRecord);

  return difference(requiredKeys, actualKeys);
}

export function collectKeys(obj, prefix = ''): string[] {
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
  ).filter(Boolean);
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
    let value: unknown = showIfVariablesPaths?.includes(path) ? true : lastPart;

    const lastDot = path.lastIndexOf('.');
    const finalPart = lastDot === -1 ? path : path.substring(0, lastDot);

    if (lastPart === 'payload' && DIGEST_EVENTS_VARIABLE_PATTERN.test(finalPart)) {
      value = {};
    }

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
 * in this case Target: FE Payload, Source: BE Payload
 *
 * @example
 * Target: {
 *        "payload": {
 *          "cat": "hello",
 *        }
 *      },
 * Source: {
 *        "payload": {
 *          "cat": "cat",
 *          "name": "name"
 *        }
 *      },
 * Result: {
 *        "payload": {
 *          "cat": "hello",
 *          "name": "name"
 *        }
 *      },
 */

export function mergeCommonObjectKeys(target: Record<string, unknown>, source: Record<string, unknown>) {
  return mergeWith({}, source, target, (sVal, tVal) => {
    const sIsObj = isObject(sVal);
    const tIsObj = isObject(tVal);

    if (isArray(sVal) && isArray(tVal)) {
      const mergedArray = sVal.map((sItem, i) => {
        const tItem = tVal[i];
        if (tItem === undefined) return sItem;

        const sItemIsObj = isObject(sItem);
        const tItemIsObj = isObject(tItem);

        if (!sItemIsObj && !tItemIsObj) {
          return tItem;
        }

        return mergeCommonObjectKeys(tItem as Record<string, unknown>, sItem as Record<string, unknown>);
      });

      /**
       * If the merged array is longer than the target array,
       * slice it to match the target length.
       */
      if (mergedArray.length > tVal.length) {
        return mergedArray.slice(0, tVal.length);
      }

      /**
       * If merged array is shorter than target array,
       * fill the difference with merged object of last item
       * and the rest of the target array.
       */
      if (mergedArray.length < tVal.length) {
        const lastItem = mergedArray[mergedArray.length - 1];
        const fillCount = tVal.length - mergedArray.length;
        const remainingItems = tVal.slice(mergedArray.length);
        for (let idx = 0; idx < fillCount; idx += 1) {
          const mergedObject = mergeCommonObjectKeys(remainingItems[idx], lastItem);
          mergedArray.push(mergedObject);
        }

        return mergedArray;
      }

      return mergedArray;
    }

    if (isArray(tVal) && !isArray(sVal)) {
      /**
       * If target is an array and source is not,
       * map over the target array and merge each object item with source.
       */
      return (tVal as unknown[]).map((item) => {
        if (isObject(item)) {
          return mergeCommonObjectKeys(item as Record<string, unknown>, sVal as Record<string, unknown>);
        }

        return item;
      });
    }

    if (tIsObj && !sIsObj) {
      /**
       * If target is an object and source is not, return target.
       */
      return tVal;
    }

    if (!sIsObj || !tIsObj) {
      /*
       * If both are not objects, return target (FE payload)
       * because we want to keep the FE payload.
       * e.g target: { cat: 'hello' }, source: { cat: 'cat' }
       * return target ( cat: 'hello' ) as FE has higher priority for same keys.
       *
       * If either of them is an object, return source.
       * e.g target: { cat: 'hello' }, source: { cat: { name: 'cat' } }
       * return source ( cat: { name: 'cat' } ) as in this case BE payload
       * should be considered as source of truth. This fixes the issue
       * of stale/edited payload in FE.
       */
      return !sIsObj && !tIsObj ? tVal : sVal;
    }

    /**
     * If both are objects, fallback to lodash's default merging.
     */
    return undefined;
  });
}
