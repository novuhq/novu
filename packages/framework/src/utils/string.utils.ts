/// <reference lib="es2021" />

export const toConstantCase = (str: string): string =>
  str
    .replaceAll(/([a-z])([A-Z])/g, '$1_$2')
    .replaceAll(/[\s-]+/g, '_')
    .toUpperCase();

/**
 * Converts an enum to a pretty string,
 * wrapping the values in backticks and joining them with a comma
 * @param _enum The enum
 * @returns A pretty string
 */

export const enumToPrettyString = <T extends Object>(_enum: T): string =>
  Object.values(_enum)
    .map((method) => `\`${method}\``)
    .join(', ');

export const toPascalCase = (str: string): string =>
  str.replaceAll(/(\w)(\w*)/g, (_, first, rest) => first.toUpperCase() + rest.toLowerCase()).replaceAll(/[\s-]+/g, '');

/**
 * Converts a data structure to a string with single quotes,
 * converting primitives to strings.
 * @param value The value to convert
 * @returns A string with single quotes around objects and arrays, and the stringified value itself if it's not an object or array
 */
export const stringifyDataStructureWithSingleQuotes = (value: unknown, spaces: number = 0): string => {
  if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
    const valueStringified = JSON.stringify(value, null, spaces);
    const valueSingleQuotes = valueStringified.replace(/"/g, "'");
    const valueEscapedNewLines = valueSingleQuotes.replace(/\n/g, '\\n');

    return valueEscapedNewLines;
  } else {
    return String(value);
  }
};
