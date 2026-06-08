import { describe, expect, it } from 'vitest';
import { getKeylessConfigKey, normalizeConnectApiUrl } from './keyless-config';

describe('normalizeConnectApiUrl', () => {
  it('trims whitespace and removes trailing slashes', () => {
    expect(normalizeConnectApiUrl(' https://api.novu.co/ ')).toBe('https://api.novu.co');
  });
});

describe('getKeylessConfigKey', () => {
  it('returns stable scoped keys for the same api url', () => {
    const first = getKeylessConfigKey('https://api.novu.co');
    const second = getKeylessConfigKey('https://api.novu.co/');

    expect(first).toBe(second);
    expect(first.startsWith('connectKeylessApplicationIdentifier-')).toBe(true);
  });

  it('returns different keys for different api urls', () => {
    const us = getKeylessConfigKey('https://api.novu.co');
    const local = getKeylessConfigKey('https://api.novu.localhost');

    expect(us).not.toBe(local);
  });
});
