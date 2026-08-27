import { describe, expect, test } from 'vitest';
import { isTimeoutError } from './is-timeout-error';

describe('isTimeoutError', () => {
  test.each([
    ['an axios timeout', { code: 'ECONNABORTED' }],
    ['an axios clarified timeout', { code: 'ETIMEDOUT' }],
    ['an AbortSignal.timeout rejection', { name: 'TimeoutError' }],
  ])('recognises %s', (_label, error) => {
    expect(isTimeoutError(error)).toBe(true);
  });

  test.each([
    ['a refused connection', { code: 'ECONNREFUSED' }],
    ['a DNS failure', { code: 'ENOTFOUND' }],
    ['a reset connection', { code: 'ECONNRESET' }],
    ['a caller abort', { name: 'AbortError' }],
    ['a plain error', new Error('boom')],
    ['null', null],
    ['undefined', undefined],
    ['a string', 'ECONNABORTED'],
  ])('does not treat %s as a timeout', (_label, error) => {
    expect(isTimeoutError(error)).toBe(false);
  });
});
