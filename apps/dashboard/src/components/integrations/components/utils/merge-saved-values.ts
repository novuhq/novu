type FormValues = Record<string, unknown>;

// Merged per key, so a credential the user typed survives a configuration change the Copilot made, and back.
const PER_KEY_FIELDS = new Set(['credentials', 'configurations']);

function isSame(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function pick<T>(saved: T, current: T, next: T): T {
  return isSame(current, saved) ? next : current;
}

function asRecord(value: unknown): FormValues {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as FormValues) : {};
}

function mergeRecord(saved: unknown, current: unknown, next: unknown): FormValues {
  const [savedRecord, currentRecord, nextRecord] = [saved, current, next].map(asRecord);
  const keys = new Set([...Object.keys(savedRecord), ...Object.keys(currentRecord), ...Object.keys(nextRecord)]);
  const merged: FormValues = {};

  for (const key of keys) {
    const value = pick(savedRecord[key], currentRecord[key], nextRecord[key]);
    if (value !== undefined) merged[key] = value;
  }

  return merged;
}

/**
 * The form values once the integration was saved again elsewhere (by the Copilot): the newly saved values, except
 * where the form changed a value from the one saved before. Compares values rather than react-hook-form's dirty
 * fields, since some inputs set values without marking them dirty.
 */
export function mergeSavedValues(saved: FormValues, current: FormValues, next: FormValues): FormValues {
  const keys = new Set([...Object.keys(saved), ...Object.keys(current), ...Object.keys(next)]);
  const merged: FormValues = {};

  for (const key of keys) {
    const value =
      isSame(current[key], saved[key]) || !PER_KEY_FIELDS.has(key)
        ? pick(saved[key], current[key], next[key])
        : mergeRecord(saved[key], current[key], next[key]);
    // No undefined keys: react-hook-form counts them, and would call an untouched form dirty.
    if (value !== undefined) merged[key] = value;
  }

  return merged;
}
