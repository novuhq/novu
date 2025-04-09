import pluralize from 'pluralize';

import { getNestedValue } from '../utils/object.utils';

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
  keyPath: string = '',
  limit = 2,
  overflowSuffix = 'other',
  wordsConnector = ', ',
  twoWordsConnector = ' and ',
  lastWordConnector = ', and '
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
