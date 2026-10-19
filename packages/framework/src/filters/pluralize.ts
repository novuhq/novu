import plur from 'pluralize';

/**
 * Creates a pluralized string based on the count of the item.
 * Example:
 * - 0, "event" -> ""
 * - 1, "event" -> 1 event
 * - 2, "event" -> 2 events
 * - 1, "event", "", false -> event
 * - 2, "event", "", false -> events
 *
 * @param item The item to pluralize
 * @param singular The singular form of the word
 * @param plural The plural form of the word
 * @param showCount Whether to include the count in the output (default: true)
 */
export function pluralize(
  item: unknown,
  singular: string = '',
  plural: string = '',
  showCount: 'true' | 'false' = 'true'
): string {
  if (item === null || item === undefined) {
    return '';
  }

  let count = 0;
  if (Array.isArray(item)) {
    count = item.length;
  } else if (typeof item === 'object') {
    count = Object.keys(item).length;
  } else if (typeof item === 'string') {
    count = +item;
  } else if (typeof item === 'number') {
    count = item;
  } else {
    count = Number(item);
  }

  if (Number.isNaN(count)) {
    count = 0;
  }

  if (count <= 0) {
    return '';
  }

  let word: string;
  if (plural) {
    word = count === 1 ? singular : plural;
  } else {
    // if no plural is provided we assume the english language rules
    word = plur(singular, count);
  }

  return showCount === 'true' ? `${count} ${word}` : word;
}
