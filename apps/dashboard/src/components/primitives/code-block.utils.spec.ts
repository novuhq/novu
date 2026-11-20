import { describe, expect, it } from 'vitest';
import { applySecretMask } from './code-block.utils';

describe('applySecretMask', () => {
  it('returns empty string when code is missing', () => {
    expect(applySecretMask(undefined, [{ line: 1 }], false)).toBe('');
  });

  it('skips masks that point at missing lines instead of throwing', () => {
    expect(applySecretMask('NOVU_SECRET_KEY=abc', [{ line: 0 }], false)).toBe('NOVU_SECRET_KEY=abc');
    expect(applySecretMask('NOVU_SECRET_KEY=abc', [{ line: 4 }], false)).toBe('NOVU_SECRET_KEY=abc');
  });

  it('masks a bounded range without using a negative repeat count', () => {
    expect(applySecretMask('NOVU_SECRET_KEY=abcdef', [{ line: 1, maskStart: 16, maskEnd: 18 }], false)).toBe(
      'NOVU_SECRET_KEY=••cdef'
    );
  });
});
