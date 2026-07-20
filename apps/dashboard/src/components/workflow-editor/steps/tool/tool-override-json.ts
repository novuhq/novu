/**
 * Returns the first duplicated key at the root of a JSON object literal.
 * Nested object keys are ignored. Assumes `text` is already valid JSON.
 */
export function findDuplicateRootKey(text: string): string | undefined {
  const seen = new Set<string>();
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
        return undefined;
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
        return undefined;
      }

      if (seen.has(key)) {
        return key;
      }

      seen.add(key);
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

  return undefined;
}
