import { assertAllowedSinchSmsRegion } from '../consts/sinch-sms-regions';
import { describe, expect, it } from 'vitest';

describe('sinch-sms-regions', () => {
  it('accepts known regions', () => {
    expect(assertAllowedSinchSmsRegion('eu')).toBe('eu');
    expect(assertAllowedSinchSmsRegion('US')).toBe('us');
    expect(assertAllowedSinchSmsRegion(undefined)).toBe('eu');
  });

  it('rejects unknown or injected regions', () => {
    expect(() => assertAllowedSinchSmsRegion('evil.com#@sinch.com')).toThrow(/Invalid Sinch region/);
    expect(() => assertAllowedSinchSmsRegion('eu/internal')).toThrow(/Invalid Sinch region/);
  });
});
