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

  it('throws when the region cannot be inferred and no baseUrl is given', () => {
    expect(() => resolveBirdBaseUrl('invalid-key')).toThrow(/Could not infer Bird region/);
  });
});
