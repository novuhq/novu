import { UserEntity, OrganizationEntity, EnvironmentEntity } from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { GetFeatureFlagCommand } from './get-feature-flag.command';
import { GetFeatureFlagService } from './get-feature-flag.usecase';
import { FeatureFlagsService } from '../../../services/feature-flags.service';

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
          environment: { _id: 'environmentId' } as EnvironmentEntity,
          organization: { _id: 'organizationId' } as OrganizationEntity,
          user: { _id: 'userId' } as UserEntity,
        });
      });

      it('should return default hardcoded value when no SDK env is set and no feature flag is set', async () => {
        process.env[mockKey] = '';

        const getFeatureFlagService = new GetFeatureFlagService(new FeatureFlagsService());

        const result = await getFeatureFlagService.getBoolean(getFeatureFlagCommand);
        expect(result).toEqual(false);
      });

      it('should return env variable value when no SDK env is set but the feature flag is set', async () => {
        process.env[mockKey] = 'true';

        const getFeatureFlagService = new GetFeatureFlagService(new FeatureFlagsService());

        const result = await getFeatureFlagService.getBoolean(getFeatureFlagCommand);
        expect(result).toEqual(true);
      });
    });

    describe('SDK key environment variable IS set', () => {
      beforeEach(async () => {
        process.env.LAUNCH_DARKLY_SDK_KEY = originalLaunchDarklySdkKey;

        getFeatureFlagCommand = GetFeatureFlagCommand.create({
          key: mockKey,
          environment: { _id: 'environmentId' } as EnvironmentEntity,
          organization: { _id: 'organizationId' } as OrganizationEntity,
          user: { _id: 'userId' } as UserEntity,
        });
      });

      it(`should get the feature flag value stored in Launch Darkly (enabled)
           when the SDK key env variable is set regardless of the feature flag set`, async () => {
        process.env[mockKey] = 'false';

        const getFeatureFlagService = new GetFeatureFlagService(new FeatureFlagsService());

        const result = await getFeatureFlagService.getBoolean(getFeatureFlagCommand);
        expect(result).toEqual(true);
      });
    });
  });
});
