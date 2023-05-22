import { Test } from '@nestjs/testing';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

import { FeatureFlagCommand, GetFeatureFlag, GetFeatureFlagCommand } from '../use-cases';

describe('Get Feature Flag', () => {
  let featureFlagCommand: FeatureFlagCommand;
  let getFeatureFlag: GetFeatureFlag;
  let session: UserSession;

  before(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [],
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

  describe('Provider: Launch Darkly', () => {
    describe('IS_TEMPLATE_STORE_ENABLED', () => {
      it('should get the feature flag value stored', async () => {
        const result = await getFeatureFlag.isTemplateStoreEnabled(featureFlagCommand);

        expect(result).to.equal(true);
      });
    });
  });
});
