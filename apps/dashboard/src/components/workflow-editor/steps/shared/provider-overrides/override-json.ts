/**
 * Collects root-level object keys from a JSON object literal, including incomplete
 * documents (returns keys parsed so far). Nested object keys are ignored.
 */
function collectRootKeys(text: string): string[] {
  const keys: string[] = [];
  let depth = 0;
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (char === '"') {
      const start = i;
      i += 1;

      while (i < text.length) {
        if (text[i] === '\\') {
          i += 2;
          continue;
        }

        if (text[i] === '"') {
          break;
        }

        i += 1;
      }

      if (i >= text.length) {
        return keys;
      }

      const end = i;
      i += 1;

      if (depth !== 1) {
        continue;
      }

      let j = i;
      while (j < text.length && /\s/.test(text[j])) {
        j += 1;
      }

      if (text[j] !== ':') {
        continue;
      }

      let key: string;
      try {
        key = JSON.parse(text.slice(start, end + 1)) as string;
      } catch {
        return keys;
      }

      keys.push(key);
      continue;
    }

    if (char === '{' || char === '[') {
      depth += 1;
      i += 1;
      continue;
    }

    if (char === '}' || char === ']') {
      depth -= 1;
      i += 1;
      continue;
    }

    i += 1;
  }

  return keys;
}

/** Returns the first duplicated key at the root of a JSON object literal. */
export function findDuplicateRootKey(text: string): string | undefined {
  const seen = new Set<string>();

  for (const key of collectRootKeys(text)) {
    if (seen.has(key)) {
      return key;
    }

    seen.add(key);
  }

  return undefined;
}
