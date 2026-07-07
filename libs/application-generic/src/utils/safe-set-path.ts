export const UNSAFE_PATH_SEGMENT_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
  'toString',
  'valueOf',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toLocaleString',
]);

function isIndexSegment(segment: string): boolean {
  return /^\d+$/.test(segment);
}

export function isUnsafePathSegment(segment: string): boolean {
  return !isIndexSegment(segment) && UNSAFE_PATH_SEGMENT_KEYS.has(segment);
}

export function parseDotBracketPath(path: string): string[] {
  return path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter((segment) => segment.length > 0);
}

export function isSafeDotBracketPath(path: string): boolean {
  const segments = parseDotBracketPath(path);

  return segments.length > 0 && !segments.some(isUnsafePathSegment);
}

function createPathNode(nextSegment: string): Record<string, unknown> | unknown[] {
  return isIndexSegment(nextSegment) ? [] : {};
}

/**
 * Assigns `value` at a dot/bracket path, only reusing own properties and never
 * following inherited ones, so a user-controlled path cannot reach a builtin on
 * the prototype chain.
 */
export function safeSetPath(root: Record<string, unknown>, path: string, value: unknown): void {
  const segments = parseDotBracketPath(path);

  if (segments.length === 0 || segments.some(isUnsafePathSegment)) {
    return;
  }

  let node: Record<string, unknown> | unknown[] = root;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const isIndex = isIndexSegment(segment);

    if (isIndex && !Array.isArray(node)) {
      return;
    }

    const container = node as Record<string, unknown> | unknown[];
    const key = isIndex ? Number(segment) : segment;

    if (index === segments.length - 1) {
      (container as Record<string | number, unknown>)[key] = value;

      return;
    }

    const hasOwn = isIndex ? true : Object.prototype.hasOwnProperty.call(container, key);
    const existing = hasOwn ? (container as Record<string | number, unknown>)[key] : undefined;

    if (existing !== undefined && existing !== null && typeof existing !== 'object') {
      return;
    }

    if (existing === null || typeof existing !== 'object') {
      (container as Record<string | number, unknown>)[key] = createPathNode(segments[index + 1]);
    }

    node = (container as Record<string | number, unknown>)[key] as Record<string, unknown> | unknown[];
  }
}
