import { expect, test } from 'vitest';
import { isInfobipSmsBaseUrlValid, resolveInfobipSmsBaseUrl } from './infobip-sms-credentials';

test('resolveInfobipSmsBaseUrl returns actionable error for missing baseUrl', () => {
  expect(() => resolveInfobipSmsBaseUrl(undefined)).toThrow(
    'Infobip SMS integration is misconfigured: Infobip base URL blocked: Base URL is required. Update the integration Base URL in the dashboard.'
  );
});

test('isInfobipSmsBaseUrlValid returns false for missing baseUrl', () => {
  expect(isInfobipSmsBaseUrlValid(undefined)).toBe(false);
});

test('isInfobipSmsBaseUrlValid returns true for valid baseUrl', () => {
  expect(isInfobipSmsBaseUrlValid('https://abc123.api.infobip.com')).toBe(true);
});
