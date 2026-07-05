import { expect, test } from 'vitest';
import { resolveSafeInfobipBaseUrl } from './safe-infobip-base-url';

test('accepts regional Infobip API base URLs', () => {
  const url = resolveSafeInfobipBaseUrl('https://abc123.api.infobip.com');

  expect(url).toBe('https://abc123.api.infobip.com');
});

test('accepts scheme-less Infobip hostnames', () => {
  const url = resolveSafeInfobipBaseUrl('abc123.api.infobip.com');

  expect(url).toBe('https://abc123.api.infobip.com');
});

test('rejects localhost base URLs', () => {
  expect(() => resolveSafeInfobipBaseUrl('http://localhost:8080')).toThrow(
    'Infobip base URL blocked: Requests to "localhost" are not allowed.'
  );
});

test('rejects non-Infobip hostnames', () => {
  expect(() => resolveSafeInfobipBaseUrl('https://evil.example.com')).toThrow(
    'Infobip base URL blocked: Hostname must be an Infobip API endpoint (*.api.infobip.com).'
  );
});

test('rejects non-https URLs', () => {
  expect(() => resolveSafeInfobipBaseUrl('http://abc123.api.infobip.com')).toThrow(
    'Infobip base URL blocked: Only https URLs are allowed.'
  );
});

test('rejects missing base URLs', () => {
  expect(() => resolveSafeInfobipBaseUrl(undefined)).toThrow('Infobip base URL blocked: Base URL is required.');
});
