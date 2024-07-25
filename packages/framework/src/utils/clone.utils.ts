/**
 * Deep clone data.
 * Uses builtin structuredClone if available, otherwise fallback to JSON.parse(JSON.stringify(obj))
 *
 * @param obj - The data to clone.
 * @returns The cloned data.
 */
export const cloneData = <T>(obj: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(obj);
  } else {
    return JSON.parse(JSON.stringify(obj));
  }
};
