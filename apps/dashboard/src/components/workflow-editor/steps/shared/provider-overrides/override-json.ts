export type RootKeyOffset = {
  key: string;
  /** Offset of the key's opening quote. */
  from: number;
};

/**
 * Collects root-level object keys and their offsets from a JSON object literal, including
 * incomplete documents (returns keys parsed so far). Nested object keys are ignored.
 */
export function findRootKeyOffsets(text: string): RootKeyOffset[] {
  const keys: RootKeyOffset[] = [];
  let depth = 0;
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (char === '"') {
      const end = findStringEnd(text, i);
      if (end === undefined) {
        return keys;
      }

      if (depth === 1 && isFollowedByColon(text, end + 1)) {
        const key = parseJsonString(text.slice(i, end + 1));
        if (key === undefined) {
          return keys;
        }

        keys.push({ key, from: i });
      }

      i = end + 1;
      continue;
    }

    if (char === '{' || char === '[') {
      depth += 1;
    } else if (char === '}' || char === ']') {
      depth -= 1;
    }

    i += 1;
  }

  return keys;
}

/** The offset of the quote closing the string opened at `start`, or undefined if it never closes. */
function findStringEnd(text: string, start: number): number | undefined {
  let i = start + 1;

  while (i < text.length) {
    if (text[i] === '\\') {
      i += 2;
      continue;
    }

    if (text[i] === '"') {
      return i;
    }

    i += 1;
  }

  return undefined;
}

function isFollowedByColon(text: string, from: number): boolean {
  let i = from;
  while (i < text.length && /\s/.test(text[i])) {
    i += 1;
  }

  return text[i] === ':';
}

function parseJsonString(literal: string): string | undefined {
  try {
    return JSON.parse(literal) as string;
  } catch {
    return undefined;
  }
}

/** Returns the first duplicated key at the root of a JSON object literal. */
export function findDuplicateRootKey(text: string): string | undefined {
  const seen = new Set<string>();

  for (const { key } of findRootKeyOffsets(text)) {
    if (seen.has(key)) {
      return key;
    }

    seen.add(key);
  }

  return undefined;
}
