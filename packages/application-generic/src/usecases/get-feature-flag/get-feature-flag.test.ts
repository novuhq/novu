import { FeatureFlagCommand } from './get-feature-flag.command';
import { GetFeatureFlag } from './get-feature-flag.use-case';
import { FeatureFlagsService } from '../../services';

const originalLaunchDarklySdkKey = process.env.LAUNCH_DARKLY_SDK_KEY;

describe('Get Feature Flag', () => {
  let featureFlagCommand: FeatureFlagCommand;
  let getFeatureFlag: GetFeatureFlag;

  describe('Provider: Launch Darkly', () => {
    describe('No SDK key environment variable is set', () => {
      beforeEach(async () => {
        process.env.LAUNCH_DARKLY_SDK_KEY = '';

        featureFlagCommand = FeatureFlagCommand.create({
          environmentId: 'environmentId',
          organizationId: 'organizationId',
          userId: 'userId',
        });

        getFeatureFlag = new GetFeatureFlag(new FeatureFlagsService());
      });

      describe('IS_IN_MEMORY_CLUSTER_MODE_ENABLED', () => {
        it('should return default hardcoded value when no SDK env is set and no feature flag is set', async () => {
          process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = '';

          const result = await getFeatureFlag.isInMemoryClusterModeEnabled();
          expect(result).toEqual(false);
        });

        it('should return env variable value when no SDK env is set but the feature flag is set', async () => {
          process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'true';

          const result = await getFeatureFlag.isInMemoryClusterModeEnabled();
          expect(result).toEqual(true);
        });
      });

      describe('IS_TEMPLATE_STORE_ENABLED', () => {
        it('should return default hardcoded value when no SDK env is set and no feature flag is set', async () => {
          process.env.IS_TEMPLATE_STORE_ENABLED = '';

          const result = await getFeatureFlag.isTemplateStoreEnabled(
            featureFlagCommand
          );
          expect(result).toEqual(false);
        });

        it('should return env variable value when no SDK env is set but the feature flag is set', async () => {
          process.env.IS_TEMPLATE_STORE_ENABLED = 'true';

          const result = await getFeatureFlag.isTemplateStoreEnabled(
            featureFlagCommand
          );
          expect(result).toEqual(true);
        });
      });

      describe('IS_MULTI_PROVIDER_CONFIGURATION_ENABLED', () => {
        it('should return default hardcoded value when no SDK env is set and no feature flag is set', async () => {
          process.env.IS_MULTI_PROVIDER_CONFIGURATION_ENABLED = '';

          const result =
            await getFeatureFlag.isMultiProviderConfigurationEnabled(
              featureFlagCommand
            );
          expect(result).toEqual(false);
        });

        it('should return env variable value when no SDK env is set but the feature flag is set', async () => {
          process.env.IS_MULTI_PROVIDER_CONFIGURATION_ENABLED = 'true';

          const result =
            await getFeatureFlag.isMultiProviderConfigurationEnabled(
              featureFlagCommand
            );
          expect(result).toEqual(true);
        });
      });

      describe('IS_TOPIC_NOTIFICATION_ENABLED', () => {
        it('should return default hardcoded value when no SDK env is set and no feature flag is set', async () => {
          process.env.FF_IS_TOPIC_NOTIFICATION_ENABLED = '';

          const result = await getFeatureFlag.isTopicNotificationEnabled(
            featureFlagCommand
          );
          expect(result).toEqual(true);
        });

        it('should return env variable value when no SDK env is set but the feature flag is set', async () => {
          process.env.FF_IS_TOPIC_NOTIFICATION_ENABLED = 'false';

          const result = await getFeatureFlag.isTopicNotificationEnabled(
            featureFlagCommand
          );
          expect(result).toEqual(false);
        });
      });
    });

    describe('SDK key environment variable is set', () => {
      beforeEach(async () => {
        process.env.LAUNCH_DARKLY_SDK_KEY = originalLaunchDarklySdkKey;

        featureFlagCommand = FeatureFlagCommand.create({
          environmentId: 'environmentId',
          organizationId: 'organizationId',
          userId: 'userId',
        });

        getFeatureFlag = new GetFeatureFlag(new FeatureFlagsService());
      });

      describe('IS_IN_MEMORY_CLUSTER_MODE_ENABLED', () => {
        it(`should get the feature flag value stored in Launch Darkly (enabled)
           when the SDK key env variable is set regardless of the feature flag set`, async () => {
          process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';

          const result = await getFeatureFlag.isInMemoryClusterModeEnabled();

          expect(result).toEqual(true);
        });
      });

      describe('IS_TEMPLATE_STORE_ENABLED', () => {
        it(`should get the feature flag value stored in Launch Darkly (enabled)
           when the SDK key env variable is set regardless of the feature flag set`, async () => {
          process.env.IS_TEMPLATE_STORE_ENABLED = 'false';

          const result = await getFeatureFlag.isTemplateStoreEnabled(
            featureFlagCommand
          );

          expect(result).toEqual(true);
        });
      });

      describe('IS_MULTI_PROVIDER_CONFIGURATION_ENABLED', () => {
        it(`should get the feature flag value stored in Launch Darkly (enabled)
           when the SDK key env variable is set regardless of the feature flag set`, async () => {
          process.env.IS_MULTI_PROVIDER_CONFIGURATION_ENABLED = 'false';

          const result =
            await getFeatureFlag.isMultiProviderConfigurationEnabled(
              featureFlagCommand
            );

          expect(result).toEqual(true);
        });
      });

      describe('IS_TOPIC_NOTIFICATION_ENABLED', () => {
        it(`should get the feature flag value stored in Launch Darkly (enabled)
           when the SDK key env variable is set regardless of the feature flag set`, async () => {
          process.env.FF_IS_TOPIC_NOTIFICATION_ENABLED = 'false';

          const result = await getFeatureFlag.isTopicNotificationEnabled(
            featureFlagCommand
          );

          expect(result).toEqual(true);
        });
      });
    });
  });
});
