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
// eslint-disable-next-line @typescript-eslint/ban-types
export const enumToPrettyString = <T extends Object>(_enum: T): string =>
  Object.values(_enum)
    .map((method) => `\`${method}\``)
    .join(', ');

export const toPascalCase = (str: string): string =>
  str.replaceAll(/(\w)(\w*)/g, (_, first, rest) => first.toUpperCase() + rest.toLowerCase()).replaceAll(/[\s-]+/g, '');
