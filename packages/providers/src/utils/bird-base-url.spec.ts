import { describe, expect, it } from 'vitest';
import { resolveBirdBaseUrl } from './bird-base-url';

describe('resolveBirdBaseUrl', () => {
  it('infers the EU region host from the API key prefix', () => {
    expect(resolveBirdBaseUrl('bk_eu1_abc')).toBe('https://eu1.platform.bird.com');
  });

  it('infers the US region host from the API key prefix', () => {
    expect(resolveBirdBaseUrl('bk_us1_abc')).toBe('https://us1.platform.bird.com');
  });

  it('prefers an explicit baseUrl over region inference', () => {
    expect(resolveBirdBaseUrl('bk_eu1_abc', 'http://localhost:8080/')).toBe('http://localhost:8080');
  });

  it.each(['javascript:alert(1)', 'https://user:password@example.com'])('rejects unsafe baseUrl %s', (baseUrl) => {
    expect(() => resolveBirdBaseUrl('bk_eu1_abc', baseUrl)).toThrow(/Bird baseUrl must be a valid HTTP or HTTPS URL/);
  });

  it.each(['bk_127.0.0.1/#_x', 'bk_evil.example/_x', 'bk_x@127.0.0.1/_y', 'bk_a?b_c', 'bk_a\\b_c', 'bk__x'])(
    'rejects a crafted API key %s instead of building an attacker host',
    (apiKey) => {
      expect(() => resolveBirdBaseUrl(apiKey)).toThrow(/Could not infer Bird region/);
    }
  );

  it('throws when the region cannot be inferred and no baseUrl is given', () => {
    expect(() => resolveBirdBaseUrl('invalid-key')).toThrow(/Could not infer Bird region/);
  });
});
