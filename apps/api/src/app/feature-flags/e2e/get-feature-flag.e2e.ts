import { Test } from '@nestjs/testing';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

import { FeatureFlagCommand, GetFeatureFlag, GetFeatureFlagCommand } from '../use-cases';
import { FeatureFlagsModule } from '../feature-flags.module';

const originalLaunchDarklySdkKey = process.env.LAUNCH_DARKLY_SDK_KEY;

describe('Get Feature Flag', () => {
  let featureFlagCommand: FeatureFlagCommand;
  let getFeatureFlag: GetFeatureFlag;
  let session: UserSession;

  describe('Provider: Launch Darkly', () => {
    describe('No SDK key environment variable is set', () => {
      beforeEach(async () => {
        process.env.LAUNCH_DARKLY_SDK_KEY = '';

        const moduleRef = await Test.createTestingModule({
          imports: [FeatureFlagsModule],
          providers: [],
        }).compile();

        session = new UserSession();
        await session.initialize();

        featureFlagCommand = FeatureFlagCommand.create({
          environmentId: session.environment._id,
          organizationId: session.organization._id,
          userId: session.user._id,
        });

        getFeatureFlag = moduleRef.get<GetFeatureFlag>(GetFeatureFlag);
      });

      describe('IS_TEMPLATE_STORE_ENABLED', () => {
        it('should return default hardcoded value when no SDK env is set and no feature flag is set', async () => {
          process.env.IS_TEMPLATE_STORE_ENABLED = '';

          const result = await getFeatureFlag.isTemplateStoreEnabled(featureFlagCommand);
          expect(result).to.equal(false);
        });

        it('should return default hardcoded value when no SDK env is set but the feature flag is set', async () => {
          process.env.IS_TEMPLATE_STORE_ENABLED = 'true';

          const result = await getFeatureFlag.isTemplateStoreEnabled(featureFlagCommand);
          expect(result).to.equal(true);
        });
      });
    });

    describe('SDK key environment variable is set', () => {
      beforeEach(async () => {
        process.env.LAUNCH_DARKLY_SDK_KEY = originalLaunchDarklySdkKey;

        const moduleRef = await Test.createTestingModule({
          imports: [FeatureFlagsModule],
          providers: [],
        }).compile();

        session = new UserSession();
        await session.initialize();

        featureFlagCommand = FeatureFlagCommand.create({
          environmentId: session.environment._id,
          organizationId: session.organization._id,
          userId: session.user._id,
        });

        getFeatureFlag = moduleRef.get<GetFeatureFlag>(GetFeatureFlag);
      });

      it(`should get the feature flag value stored in Launch Darkly (enabled)
         when the SDK key env variable is set regardless of the feature flag set`, async () => {
        process.env.IS_TEMPLATE_STORE_ENABLED = 'false';

        console.log(originalLaunchDarklySdkKey.startsWith('sdk-c66'));
        const result = await getFeatureFlag.isTemplateStoreEnabled(featureFlagCommand);

        expect(result).to.equal(true);
      });
    });
  });
});
