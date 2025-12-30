import { Liquid, LiquidOptions } from 'liquidjs';
import { digest } from '../filters/digest';
import { pluralize } from '../filters/pluralize';
import { toSentence } from '../filters/to-sentence';
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
  // For strings, escape special JSON characters: backslashes, double quotes, and newlines
  else if (typeof output === 'string') {
    return output
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  } else {
    return output === undefined || output === null ? '' : String(output as unknown);
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
    return value === undefined || value === null ? '' : String(value as unknown);
  }
};

export type CreateLiquidEngineOptions = LiquidOptions & {
  skipOutputEscape?: boolean;
};

/**
 * Creates a configured Liquid instance with Novu's default settings.
 *
 * @param options - LiquidJS options plus:
 *   - skipOutputEscape: Set to true when rendering content that will be used as HTML output.
 *     The default outputEscape is designed for JSON context (escaping quotes, newlines) which
 *     breaks HTML attributes. Email rendering should set this to true since it handles its
 *     own escaping and outputs HTML content.
 */
export function createLiquidEngine(options?: CreateLiquidEngineOptions): Liquid {
  const { skipOutputEscape, ...liquidOptions } = options ?? {};

  const liquidEngine = new Liquid({
    outputEscape: skipOutputEscape ? undefined : defaultOutputEscape,
    ...liquidOptions,
  });

  // Register default filters
  liquidEngine.registerFilter('json', (value: unknown, spaces: number) =>
    stringifyDataStructureWithSingleQuotes(value, spaces)
  );
  liquidEngine.registerFilter('digest', digest);
  liquidEngine.registerFilter('toSentence', toSentence);
  liquidEngine.registerFilter('pluralize', pluralize);

  return liquidEngine;
}
