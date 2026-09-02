import { describe, expect, test } from 'vitest';
import {
  DEFAULT_PROVIDER_HTTP_TIMEOUT_MS,
  PROVIDER_HTTP_TIMEOUT_MS,
  PROVIDER_HTTP_TIMEOUT_MS_ENV_VAR,
  resolveProviderHttpTimeoutMs,
} from './provider-http.constants';

describe('provider HTTP timeout', () => {
  test('defaults to two minutes', () => {
    expect(DEFAULT_PROVIDER_HTTP_TIMEOUT_MS).toBe(120_000);
    expect(PROVIDER_HTTP_TIMEOUT_MS).toBe(DEFAULT_PROVIDER_HTTP_TIMEOUT_MS);
  });

  test(`honours ${PROVIDER_HTTP_TIMEOUT_MS_ENV_VAR}`, () => {
    expect(resolveProviderHttpTimeoutMs({ [PROVIDER_HTTP_TIMEOUT_MS_ENV_VAR]: '45000' })).toBe(45_000);
  });

  test.each([
    ['not a number', 'abc'],
    ['zero', '0'],
    ['negative', '-1'],
    ['a fraction', '1.5'],
    ['above the Node timer limit', '2147483648'],
    ['empty', ''],
    ['unset', undefined],
  ])('falls back to the default when the override is %s', (_label, value) => {
    expect(resolveProviderHttpTimeoutMs({ [PROVIDER_HTTP_TIMEOUT_MS_ENV_VAR]: value })).toBe(
      DEFAULT_PROVIDER_HTTP_TIMEOUT_MS
    );
  });

  test('does not throw when no environment is available', () => {
    expect(resolveProviderHttpTimeoutMs(undefined)).toBe(DEFAULT_PROVIDER_HTTP_TIMEOUT_MS);
  });
});
