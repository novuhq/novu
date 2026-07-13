import { describe, expect, it } from 'vitest';
import { FeatureFlagsKeysEnum } from './feature-flags';

describe('FeatureFlagsKeysEnum', () => {
  it('defines IS_SIGNALS_CHANNEL_ENABLED', () => {
    expect(FeatureFlagsKeysEnum.IS_SIGNALS_CHANNEL_ENABLED).toBe('IS_SIGNALS_CHANNEL_ENABLED');
  });
});
