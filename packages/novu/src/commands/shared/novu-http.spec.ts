import { describe, expect, it } from 'vitest';
import { extractNovuApiMessage, isLoopbackHost, unwrapNovuApiData } from './novu-http';

describe('isLoopbackHost', () => {
  it('detects localhost and loopback hosts', () => {
    expect(isLoopbackHost('http://localhost:3000')).toBe(true);
    expect(isLoopbackHost('https://api.novu.localhost')).toBe(true);
    expect(isLoopbackHost('http://127.0.0.1:3000')).toBe(true);
    expect(isLoopbackHost('https://api.novu.co')).toBe(false);
  });

  it('does not treat non-loopback 127.* hostnames as loopback', () => {
    expect(isLoopbackHost('https://127.attacker.com')).toBe(false);
  });
});

describe('unwrapNovuApiData', () => {
  it('unwraps the Novu API response envelope', () => {
    expect(unwrapNovuApiData<{ ok: true }>({ data: { ok: true } })).toEqual({ ok: true });
  });

  it('throws when the envelope is missing', () => {
    expect(() => unwrapNovuApiData({ ok: true })).toThrow(/Unexpected Novu API response shape/);
  });
});

describe('extractNovuApiMessage', () => {
  it('reads string and array message fields', () => {
    expect(extractNovuApiMessage({ message: 'Not found' })).toBe('Not found');
    expect(extractNovuApiMessage({ message: ['a', 'b'] })).toBe('a; b');
    expect(extractNovuApiMessage({ error: 'Bad request' })).toBe('Bad request');
  });
});
