import _ from 'lodash';

export function flattenJson(obj?: Object, parentKey = '', result = {}) {
  if (!obj || typeof obj !== 'object' || _.isArray(obj)) {
    return result; // Return the result as is if obj is not a valid object
  }

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = parentKey ? `${parentKey}.${key}` : key;

      if (typeof obj[key] === 'object' && obj[key] !== null && !_.isArray(obj[key])) {
        flattenJson(obj[key], newKey, result);
      } else if (_.isArray(obj[key])) {
        obj[key].forEach((item, index) => {
          const arrayKey = `${newKey}[${index}]`;
          if (typeof item === 'object' && item !== null) {
            flattenJson(item, arrayKey, result);
          } else {
            result[arrayKey] = item;
          }
        });
      } else {
        result[newKey] = obj[key];
      }
    }
  }

  return result;
}
// Merging the JSON objects, arrays are concatenated
export function mergeObjects(json1: Record<string, unknown>, json2?: Record<string, unknown>) {
  if (!json2) {
    return json1;
  }
  if (!json1) {
    return json2;
  }

  return _.mergeWith(json1, json2, (objValue, srcValue) => {
    if (Array.isArray(objValue)) {
      return objValue.concat(srcValue); // Accumulate arrays
    }
  });
}
type FlatJson = Record<string, unknown>;
type NestedJson = Record<string, unknown>;
/**
 * Converts a flat JSON object into a nested JSON object using a specified delimiter.
 *
 * @param {FlatJson} flatJson - The flat JSON object.
 * @param {string} [delimiter='.'] - The delimiter for nested keys (default is '.').
 * @returns {NestedJson} The resulting nested JSON object.
 *
 * @example
 * const flatJson = { 'user.name': 'John', 'user.age': 30 };
 * const nestedJson = flattenToNested(flatJson);
 * // Output: { user: { name: 'John', age: 30 } }
 *
 * @example
 * const flatJson2 = { 'user|name': 'Jane', 'user|age': 25 };
 * const nestedJson2 = flattenToNested(flatJson2, '|');
 * // Output: { user: { name: 'Jane', age: 25 } }
 */
export function flattenToNested(flatJson: FlatJson, delimiter: string = '.'): NestedJson {
  const nestedJson: NestedJson = {};

  for (const flatKey of Object.keys(flatJson)) {
    const keys = flatKey.split(delimiter);
    keys.reduce((accumulator, currentKey, index) => {
      if (index === keys.length - 1) {
        accumulator[currentKey] = flatJson[flatKey];
      } else if (!accumulator[currentKey]) {
        accumulator[currentKey] = {};
      }

      return accumulator[currentKey] as NestedJson;
    }, nestedJson);
  }

  return nestedJson;
}
