type NestedObject = Record<string, unknown>;

function getNestedValue(obj: NestedObject, path: string): string {
  const value = path.split('.').reduce((current: unknown, key) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }

    return undefined;
  }, obj);

  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    const stringified = JSON.stringify(value);

    return stringified === '{}' ? '' : stringified;
  }

  return '';
}

/**
 * Format a list of items for digest notifications with configurable behavior
 * Default formatting:
 * - 1 item: "John"
 * - 2 items: "John and Josh"
 * - 3 items: "John, Josh and Sarah"
 * - 4+ items: "John, Josh and 2 others"
 *
 * @param array The array of items to format
 * @param maxNames Maximum names to show before using "others"
 * @param keyPath Path to extract from objects (e.g., "name" or "profile.name")
 * @param separator Custom separator between names (default: ", ")
 * @returns Formatted string
 *
 * Examples:
 * {{ actors | digest }} => "John, Josh and 2 others"
 * {{ actors | digest: 2 }} => "John, Josh and 3 others"
 * {{ users | digest: 2, "name" }} => For array of {name: string}
 * {{ users | digest: 2, "profile.name", "•" }} => "John • Josh and 3 others"
 */
export function digest(array: unknown, maxNames = 2, keyPath?: string, separator = ', '): string {
  if (!Array.isArray(array) || array.length === 0) return '';

  const values = keyPath
    ? array.map((item) => {
        if (typeof item !== 'object' || !item) return '';

        return getNestedValue(item as NestedObject, keyPath);
      })
    : array;

  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;

  if (values.length === 3 && maxNames >= 3) {
    return `${values[0]}, ${separator}${values[1]} and ${values[2]}`;
  }

  // Use "others" format for 4+ items or when maxNames is less than array length
  const shownItems = values.slice(0, maxNames);
  const othersCount = values.length - maxNames;

  return `${shownItems.join(separator)} and ${othersCount} ${othersCount === 1 ? 'other' : 'others'}`;
}
