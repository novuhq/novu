import {
  GetIsMultiProviderConfigurationEnabled,
  GetIsTemplateStoreEnabled,
  GetIsTopicNotificationEnabled,
} from './index';
import { FeatureFlagCommand } from './get-feature-flag.command';
import { FeatureFlagsService } from '../../services';

const originalLaunchDarklySdkKey = process.env.LAUNCH_DARKLY_SDK_KEY;

describe('Get Feature Flag', () => {
  let featureFlagCommand: FeatureFlagCommand;

  describe('Provider: Launch Darkly', () => {
    describe('No SDK key environment variable is set', () => {
      beforeEach(async () => {
        process.env.LAUNCH_DARKLY_SDK_KEY = '';

        featureFlagCommand = FeatureFlagCommand.create({
          environmentId: 'environmentId',
          organizationId: 'organizationId',
          userId: 'userId',
        });
      });

      describe('IS_TEMPLATE_STORE_ENABLED', () => {
        it('should return default hardcoded value when no SDK env is set and no feature flag is set', async () => {
          process.env.IS_TEMPLATE_STORE_ENABLED = '';

          const getIsTemplateStoreEnabled = new GetIsTemplateStoreEnabled(
            new FeatureFlagsService()
          );

          const result = await getIsTemplateStoreEnabled.execute(
            featureFlagCommand
          );
          expect(result).toEqual(false);
        });

        it('should return env variable value when no SDK env is set but the feature flag is set', async () => {
          process.env.IS_TEMPLATE_STORE_ENABLED = 'true';

          const getIsTemplateStoreEnabled = new GetIsTemplateStoreEnabled(
            new FeatureFlagsService()
          );

          const result = await getIsTemplateStoreEnabled.execute(
            featureFlagCommand
          );
          expect(result).toEqual(true);
        });
      });

      describe('IS_MULTI_PROVIDER_CONFIGURATION_ENABLED', () => {
        it('should return default hardcoded value when no SDK env is set and no feature flag is set', async () => {
          process.env.IS_MULTI_PROVIDER_CONFIGURATION_ENABLED = '';

          const getIsMultiProviderConfigurationEnabled =
            new GetIsMultiProviderConfigurationEnabled(
              new FeatureFlagsService()
            );

          const result = await getIsMultiProviderConfigurationEnabled.execute(
            featureFlagCommand
          );
          expect(result).toEqual(false);
        });

        it('should return env variable value when no SDK env is set but the feature flag is set', async () => {
          process.env.IS_MULTI_PROVIDER_CONFIGURATION_ENABLED = 'true';

          const getIsMultiProviderConfigurationEnabled =
            new GetIsMultiProviderConfigurationEnabled(
              new FeatureFlagsService()
            );

          const result = await getIsMultiProviderConfigurationEnabled.execute(
            featureFlagCommand
          );
          expect(result).toEqual(true);
        });
      });

      describe('IS_TOPIC_NOTIFICATION_ENABLED', () => {
        it('should return default hardcoded value when no SDK env is set and no feature flag is set', async () => {
          process.env.FF_IS_TOPIC_NOTIFICATION_ENABLED = '';

          const getIsTopicNotificationEnabled =
            new GetIsTopicNotificationEnabled(new FeatureFlagsService());

          const result = await getIsTopicNotificationEnabled.execute(
            featureFlagCommand
          );
          expect(result).toEqual(true);
        });

        it('should return env variable value when no SDK env is set but the feature flag is set', async () => {
          process.env.FF_IS_TOPIC_NOTIFICATION_ENABLED = 'false';

          const getIsTopicNotificationEnabled =
            new GetIsTopicNotificationEnabled(new FeatureFlagsService());

          const result = await getIsTopicNotificationEnabled.execute(
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
      });

      describe('IS_TEMPLATE_STORE_ENABLED', () => {
        it(`should get the feature flag value stored in Launch Darkly (enabled)
           when the SDK key env variable is set regardless of the feature flag set`, async () => {
          process.env.IS_TEMPLATE_STORE_ENABLED = 'false';

          const getIsTemplateStoreEnabled = new GetIsTemplateStoreEnabled(
            new FeatureFlagsService()
          );

          const result = await getIsTemplateStoreEnabled.execute(
            featureFlagCommand
          );
          expect(result).toEqual(true);
        });
      });

      describe('IS_MULTI_PROVIDER_CONFIGURATION_ENABLED', () => {
        it(`should get the feature flag value stored in Launch Darkly (enabled)
           when the SDK key env variable is set regardless of the feature flag set`, async () => {
          process.env.IS_MULTI_PROVIDER_CONFIGURATION_ENABLED = 'false';

          const getIsMultiProviderConfigurationEnabled =
            new GetIsMultiProviderConfigurationEnabled(
              new FeatureFlagsService()
            );

          const result = await getIsMultiProviderConfigurationEnabled.execute(
            featureFlagCommand
          );
          expect(result).toEqual(true);
        });
      });

      describe('IS_TOPIC_NOTIFICATION_ENABLED', () => {
        it(`should get the feature flag value stored in Launch Darkly (enabled)
           when the SDK key env variable is set regardless of the feature flag set`, async () => {
          process.env.FF_IS_TOPIC_NOTIFICATION_ENABLED = 'false';

          const getIsTopicNotificationEnabled =
            new GetIsTopicNotificationEnabled(new FeatureFlagsService());

          const result = await getIsTopicNotificationEnabled.execute(
            featureFlagCommand
          );
          expect(result).toEqual(true);
        });
      });
    });
  });
});
