import { prepareBooleanStringFeatureFlag } from './feature-flags.util';

describe('FeatureFlagUtil', () => {
  describe('prepareBooleanStringFeatureFlag', () => {
    it('should return default value when value is undefined', () => {
      expect(prepareBooleanStringFeatureFlag(undefined, true)).toEqual(true);
    });

    it('should return default value when value is empty string', () => {
      expect(prepareBooleanStringFeatureFlag('', true)).toEqual(true);
    });

    it('should return true when provided value is true', () => {
      expect(prepareBooleanStringFeatureFlag('false', true)).toEqual(false);
    });

    it('should return false when provided value is false', () => {
      expect(prepareBooleanStringFeatureFlag('false', true)).toEqual(false);
    });
  });
});
