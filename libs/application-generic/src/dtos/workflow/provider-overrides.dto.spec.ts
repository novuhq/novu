import { describe, expect, it } from 'vitest';
import { PROVIDER_OVERRIDES_API_PROPERTY } from './provider-overrides.dto';

describe('PROVIDER_OVERRIDES_API_PROPERTY', () => {
  it('exposes provider overrides as a map keyed by providerId, not fixed properties', () => {
    expect(PROVIDER_OVERRIDES_API_PROPERTY.type).toBe('object');
    expect(PROVIDER_OVERRIDES_API_PROPERTY.additionalProperties).toEqual({
      type: 'object',
      additionalProperties: true,
    });
    expect(PROVIDER_OVERRIDES_API_PROPERTY.example).toMatchObject({
      slack: expect.any(Object),
      'whatsapp-business': expect.any(Object),
      pagerduty: expect.any(Object),
    });
  });
});
