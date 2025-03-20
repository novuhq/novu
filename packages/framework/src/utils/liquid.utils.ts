import { Liquid } from 'liquidjs';
import { digest } from '../filters/digest';

/**
 * Default output escape function that properly handles objects, arrays, and strings with newlines.
 *
 * @param output - The value to escape
 * @returns The escaped value as a string
 */
export function defaultOutputEscape(output: unknown): string {
  // For objects and arrays, use the existing function
  if (Array.isArray(output) || (typeof output === 'object' && output !== null)) {
    return stringifyDataStructureWithSingleQuotes(output);
  }
  // For strings that might contain newlines, ensure proper escaping
  else if (typeof output === 'string' && output.includes('\n')) {
    return output.replace(/\n/g, '\\n');
  } else {
    return String(output);
  }
}

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

/**
 * Creates a configured Liquid instance with Novu's default settings.
 */
export function createLiquidEngine(): Liquid {
  const liquidEngine = new Liquid({
    outputEscape: defaultOutputEscape,
  });

  // Register default filters
  liquidEngine.registerFilter('json', (value, spaces) => stringifyDataStructureWithSingleQuotes(value, spaces));
  liquidEngine.registerFilter('digest', digest);

  return liquidEngine;
}
