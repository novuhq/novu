import { GetFeatureFlag } from './index';
import { GetFeatureFlagCommand } from './get-feature-flag.command';
import { FeatureFlagsService } from '../../services';
import { FeatureFlagsKeysEnum } from '../../services/types';

const originalLaunchDarklySdkKey = process.env.LAUNCH_DARKLY_SDK_KEY;
const mockKey = FeatureFlagsKeysEnum.IS_API_RATE_LIMITING_ENABLED;

describe('Get Feature Flag', () => {
  let getFeatureFlagCommand: GetFeatureFlagCommand;

  describe('Provider: Launch Darkly', () => {
    describe('SDK key environment variable IS NOT set', () => {
      beforeEach(async () => {
        process.env.LAUNCH_DARKLY_SDK_KEY = '';

        getFeatureFlagCommand = GetFeatureFlagCommand.create({
          key: mockKey,
          environmentId: 'environmentId',
          organizationId: 'organizationId',
          userId: 'userId',
        });
      });

      it('should return default hardcoded value when no SDK env is set and no feature flag is set', async () => {
        process.env[mockKey] = '';

        const getFeatureFlag = new GetFeatureFlag(new FeatureFlagsService());

        const result = await getFeatureFlag.execute(getFeatureFlagCommand);
        expect(result).toEqual(false);
      });

      it('should return env variable value when no SDK env is set but the feature flag is set', async () => {
        process.env[mockKey] = 'true';

        const getIsTemplateStoreEnabled = new GetFeatureFlag(
          new FeatureFlagsService()
        );

        const result = await getIsTemplateStoreEnabled.execute(
          getFeatureFlagCommand
        );
        expect(result).toEqual(true);
      });
    });

    describe('SDK key environment variable IS set', () => {
      beforeEach(async () => {
        process.env.LAUNCH_DARKLY_SDK_KEY = originalLaunchDarklySdkKey;

        getFeatureFlagCommand = GetFeatureFlagCommand.create({
          key: mockKey,
          environmentId: 'environmentId',
          organizationId: 'organizationId',
          userId: 'userId',
        });
      });

      it(`should get the feature flag value stored in Launch Darkly (enabled)
           when the SDK key env variable is set regardless of the feature flag set`, async () => {
        process.env[mockKey] = 'false';

        const getIsTemplateStoreEnabled = new GetFeatureFlag(
          new FeatureFlagsService()
        );

        const result = await getIsTemplateStoreEnabled.execute(
          getFeatureFlagCommand
        );
        expect(result).toEqual(true);
      });
    });
  });
});
