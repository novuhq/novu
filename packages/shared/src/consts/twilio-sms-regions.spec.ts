import { describe, expect, it } from 'vitest';
import { assertAllowedTwilioSmsRegion, getTwilioSmsClientRegionConfig } from '../consts/twilio-sms-regions';

describe('twilio-sms-regions', () => {
  it('should default to us when region is undefined', () => {
    expect(assertAllowedTwilioSmsRegion(undefined)).toBe('us');
    expect(getTwilioSmsClientRegionConfig(undefined)).toBeUndefined();
  });

  it('should normalize region casing', () => {
    expect(assertAllowedTwilioSmsRegion('EU')).toBe('eu');
    expect(getTwilioSmsClientRegionConfig('EU')).toEqual({
      edge: 'dublin',
      region: 'ie1',
    });
  });

  it('should reject invalid regions', () => {
    expect(() => assertAllowedTwilioSmsRegion('evil.com#@twilio.com')).toThrow(/Invalid Twilio SMS region/);
    expect(() => assertAllowedTwilioSmsRegion('ie1')).toThrow(/Invalid Twilio SMS region/);
  });
});
