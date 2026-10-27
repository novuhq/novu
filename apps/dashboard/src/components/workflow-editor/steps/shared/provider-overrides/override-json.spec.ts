import { describe, expect, it } from 'vitest';
import { findDuplicateRootKey, findRootKeyOffsets } from './override-json';

describe('findRootKeyOffsets', () => {
  it('returns root keys with the offset of their opening quote, skipping nested keys and values', () => {
    const text = '{\n  "a": "x:y",\n  "b": { "c": 1 },\n  "d\\"e": [{ "f": 2 }]\n}';

    expect(findRootKeyOffsets(text)).toEqual([
      { key: 'a', from: text.indexOf('"a"') },
      { key: 'b', from: text.indexOf('"b"') },
      { key: 'd"e', from: text.indexOf('"d\\"e"') },
    ]);
  });

  it('keeps the keys parsed before an unterminated string', () => {
    expect(findRootKeyOffsets('{ "a": 1, "b": "open').map(({ key }) => key)).toEqual(['a', 'b']);
  });
});

describe('findDuplicateRootKey', () => {
  it('finds a repeated root key but ignores repeats in nested objects', () => {
    expect(findDuplicateRootKey('{ "a": 1, "a": 2 }')).toBe('a');
    expect(findDuplicateRootKey('{ "a": { "b": 1 }, "c": { "b": 2 } }')).toBeUndefined();
  });
});
