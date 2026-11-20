import { ServiceUnavailableException } from '@nestjs/common';
import { FeatureFlagsService } from '@novu/application-generic';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { assertPreferencesUpdateEnabled } from './assert-preferences-update-enabled';

describe('assertPreferencesUpdateEnabled', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('should allow preference updates when the organization killswitch is disabled', async () => {
    const featureFlagsService = sinon.createStubInstance(FeatureFlagsService);
    featureFlagsService.getFlag.resolves(false);

    await assertPreferencesUpdateEnabled(featureFlagsService as any, 'org-1', 'env-1');

    expect(
      featureFlagsService.getFlag.calledOnceWithExactly({
        key: FeatureFlagsKeysEnum.IS_ORG_KILLSWITCH_FLAG_ENABLED,
        defaultValue: false,
        organization: { _id: 'org-1' },
        environment: { _id: 'env-1' },
        component: 'preferences',
      })
    ).to.be.true;
  });

  it('should reject preference updates when the organization killswitch is enabled', async () => {
    const featureFlagsService = sinon.createStubInstance(FeatureFlagsService);
    featureFlagsService.getFlag.resolves(true);

    try {
      await assertPreferencesUpdateEnabled(featureFlagsService as any, 'org-1', 'env-1');
      expect.fail('Should throw an exception');
    } catch (error) {
      expect(error).to.be.instanceOf(ServiceUnavailableException);
      expect(error.message).to.equal('Service temporarily unavailable for this organization');
    }
  });
});
