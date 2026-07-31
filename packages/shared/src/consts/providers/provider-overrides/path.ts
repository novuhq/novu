/** Keys that must never be used as object property paths (prototype pollution). */
const UNSAFE_PATH_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isSafePathSegment(segment: string): boolean {
  return segment !== '' && !UNSAFE_PATH_KEYS.has(segment);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Reads a dotted path (`text.body`) from an override object. */
export function getAtPath(target: Record<string, unknown>, path: string): unknown {
  const segments = path.split('.');
  let current: unknown = target;

  for (const segment of segments) {
    if (!isSafePathSegment(segment) || !isRecord(current) || !Object.hasOwn(current, segment)) {
      return undefined;
    }

    current = current[segment];
  }

  return current;
}

/**
 * Sets a dotted path on a shallow-cloned object tree so nested siblings of the filled
 * key (e.g. `text.preview_url` beside `text.body`) are preserved.
 */
export function setAtPath(target: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const segments = path.split('.');
  if (segments.length === 0 || segments[0] === '' || !segments.every(isSafePathSegment)) {
    return { ...target };
  }

  const result: Record<string, unknown> = { ...target };
  let current: Record<string, unknown> = result;

  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index] as string;
    const next = Object.hasOwn(current, segment) ? current[segment] : undefined;

    if (isRecord(next)) {
      current[segment] = { ...next };
    } else {
      current[segment] = {};
    }

    current = current[segment] as Record<string, unknown>;
  }

  current[segments[segments.length - 1] as string] = value;

  return result;
}
