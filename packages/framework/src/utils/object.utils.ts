export function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = { ...target };

  for (const key of Object.keys(source)) {
    const value = source[key];

    // If the value is an object and not an array, we need to merge it deeply
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // If the target doesn't have this key, create an empty object
      output[key] = deepMerge(
        (output[key] as Record<string, unknown>) || {}, // Ensure it's treated as an object
        value as Record<string, unknown> // Ensure the value is treated as an object
      );
    } else if (Array.isArray(value)) {
      // Replace the existing array with the source array
      output[key] = value; // Directly assign the source array
    } else {
      // Otherwise, just assign the value from the source
      output[key] = value;
    }
  }

  return output;
}

export function getNestedValue(obj: Record<string, unknown>, path: string): string {
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
