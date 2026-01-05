const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isUnsafeKey(key: string): boolean {
  return UNSAFE_KEYS.has(key);
}

function toPathArray(path: string | string[]): string[] {
  if (Array.isArray(path)) {
    return path;
  }

  const result: string[] = [];
  let current = '';
  let inBracket = false;

  for (let i = 0; i < path.length; i++) {
    const char = path[i];

    if (char === '[' && !inBracket) {
      if (current) {
        result.push(current);
        current = '';
      }
      inBracket = true;
    } else if (char === ']' && inBracket) {
      if (current) {
        result.push(current);
        current = '';
      }
      inBracket = false;
    } else if (char === '.' && !inBracket) {
      if (current) {
        result.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current) {
    result.push(current);
  }

  return result;
}

export function safeSet<T extends object>(object: T, path: string | string[], value: unknown): T {
  if (object === null || typeof object !== 'object') {
    return object;
  }

  const keys = toPathArray(path);

  if (keys.length === 0) {
    return object;
  }

  if (keys.some(isUnsafeKey)) {
    return object;
  }

  let current: Record<string, unknown> = object as Record<string, unknown>;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const nextKey = keys[i + 1];
    const isNextKeyNumeric = /^\d+$/.test(nextKey);

    if (current[key] === null || typeof current[key] !== 'object') {
      current[key] = isNextKeyNumeric ? [] : {};
    }

    current = current[key] as Record<string, unknown>;
  }

  const lastKey = keys[keys.length - 1];
  current[lastKey] = value;

  return object;
}
