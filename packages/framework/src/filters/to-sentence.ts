import { Filter, TokenKind } from 'liquidjs';
import { NumberToken, QuotedToken } from 'liquidjs/dist/tokens';
import pluralize from 'pluralize';
import { z } from 'zod';
import { getNestedValue } from '../utils/object.utils';
import { LiquidFilterIssue } from './types';

const DEFAULT_KEY_PATH = '';
const DEFAULT_LIMIT = 2;
const DEFAULT_OVERFLOW_SUFFIX = 'other';
const DEFAULT_WORDS_CONNECTOR = ', ';
const DEFAULT_TWO_WORDS_CONNECTOR = ' and ';
const DEFAULT_LAST_WORD_CONNECTOR = ', and ';

const ARG_INDEX_TO_ARG_NAME: Record<number, string> = {
  0: 'keyPath',
  1: 'limit',
  2: 'overflowSuffix',
  3: 'wordsConnector',
  4: 'twoWordsConnector',
  5: 'lastWordConnector',
};

/**
 * Format a list of items for digest notifications with configurable behavior
 * Default formatting:
 * - 1 item: "John"
 * - 2 items: "John and Josh"
 * - 3 items: "John, Josh, and Sarah"
 * - 4+ items: "John, Josh, and 2 others"
 *
 * @param array The array of items to format
 * @param keyPath Path to the property to extract from objects (e.g., "name" or "profile.name")
 * @param limit Maximum number of words to show before the "overflowSuffix"
 * @param overflowSuffix The word to use for the items above the limit, e.g. "other"
 * @param wordsConnector The separator between words (default: ", ")
 * @param twoWordsConnector The separator for 2 words (default: " and ")
 * @param lastWordConnector The separator for 3+ words (default: ", and ")
 * @returns Formatted string, for example: "John, Josh and 2 others"
 */
export function toSentence(
  array: unknown,
  keyPath = DEFAULT_KEY_PATH,
  limit = DEFAULT_LIMIT,
  overflowSuffix = DEFAULT_OVERFLOW_SUFFIX,
  wordsConnector = DEFAULT_WORDS_CONNECTOR,
  twoWordsConnector = DEFAULT_TWO_WORDS_CONNECTOR,
  lastWordConnector = DEFAULT_LAST_WORD_CONNECTOR
): string {
  if (!Array.isArray(array) || array.length === 0) return '';

  const values = keyPath
    ? array.map((item) => {
        if (typeof item !== 'object' || !item) return '';

        return getNestedValue(item as Record<string, unknown>, keyPath);
      })
    : array;

  const wordsLength = values.length;
  if (wordsLength === 1) return values[0];
  if (wordsLength === 2) return `${values[0]}${twoWordsConnector}${values[1]}`;

  // If limit is greater than or equal to array length, show all items
  if (limit >= wordsLength) {
    const allButLast = values.slice(0, wordsLength - 1);
    const last = values[wordsLength - 1];

    return `${allButLast.join(wordsConnector)}${lastWordConnector}${last}`;
  }

  const shownItems = values.slice(0, limit);
  const moreCount = wordsLength - limit;

  // Use twoWordsConnector when showing only 1 item before overflow
  const connector = limit === 1 ? twoWordsConnector : lastWordConnector;

  return `${shownItems.join(wordsConnector)}${connector}${moreCount} ${pluralize(overflowSuffix, moreCount)}`;
}

/**
 * Validate the arguments for the toSentence filter
 * @param options Options for validation. Can include requireKeyPath to make keyPath required.
 * @param args The arguments for the toSentence filter
 * @returns An array of issues with the validation errors
 */
export function toSentenceArgsValidator(
  options: { requireKeyPath?: boolean } = {},
  ...args: Filter['args']
): LiquidFilterIssue[] {
  const { requireKeyPath = false } = options;
  const issues: LiquidFilterIssue[] = [];
  if (args.length < 1) {
    issues.push({
      message: 'Expected at least 1 argument',
      begin: 0,
      end: 0,
      value: '',
    });

    return issues;
  }

  const argsSchema = z.object({
    keyPath: requireKeyPath ? z.string().min(1, 'must be non-empty') : z.string().optional().default(DEFAULT_KEY_PATH),
    limit: z
      .number()
      .optional()
      .default(DEFAULT_LIMIT)
      .refine((val) => {
        return val >= 0;
      }, 'must be greater than or equal to 0'),
    overflowSuffix: z.string().optional().default(DEFAULT_OVERFLOW_SUFFIX),
    wordsConnector: z.string().optional().default(DEFAULT_WORDS_CONNECTOR),
    twoWordsConnector: z.string().optional().default(DEFAULT_TWO_WORDS_CONNECTOR),
    lastWordConnector: z.string().optional().default(DEFAULT_LAST_WORD_CONNECTOR),
  });

  const argsObject: Record<string, number | string> = {};
  args.forEach((arg, index) => {
    if (!Array.isArray(arg)) {
      let value: string | number = arg.getText();
      if (arg.kind === TokenKind.Quoted) {
        value = (arg as QuotedToken).content;
      } else if (arg.kind === TokenKind.Number) {
        value = (arg as NumberToken).content;
      }
      const argName = ARG_INDEX_TO_ARG_NAME[index];
      argsObject[argName] = value;
    }
  });

  const result = argsSchema.safeParse(argsObject);

  if (!result.success) {
    for (const error of result.error.issues) {
      let type = 'string';
      if ('type' in error) {
        type = error.type;
      }

      const path = error.path[0];
      const argIndexToArgName = Object.entries(ARG_INDEX_TO_ARG_NAME).find(([_, argName]) => argName === path);
      const argIndex = argIndexToArgName ? parseInt(argIndexToArgName[0], 10) : null;
      const token = typeof argIndex === 'number' ? args[argIndex] : null;

      if (token && !Array.isArray(token)) {
        issues.push({
          message: `"toSentence" expects a ${type}${error.message ? ` that ${error.message}` : ''} for argument "${path}"`,
          begin: token.begin,
          end: token.end,
          value: token.getText(),
        });
      }
    }
  }

  return issues;
}
