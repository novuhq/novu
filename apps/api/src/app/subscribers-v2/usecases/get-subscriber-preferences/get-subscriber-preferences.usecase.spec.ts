import { ServiceUnavailableException } from '@nestjs/common';
import { FeatureFlagsService, InMemoryLRUCacheService } from '@novu/application-generic';
import { NotificationTemplateRepository, PreferencesRepository, SubscriberRepository } from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { GetSubscriberGlobalPreference } from '../../../subscribers/usecases/get-subscriber-global-preference';
import { GetSubscriberPreference } from '../../../subscribers/usecases/get-subscriber-preference';
import { GetSubscriberPreferencesCommand } from './get-subscriber-preferences.command';
import { GetSubscriberPreferences } from './get-subscriber-preferences.usecase';

describe('GetSubscriberPreferences', () => {
  let getSubscriberPreferences: GetSubscriberPreferences;
  let featureFlagsServiceMock: sinon.SinonStubbedInstance<FeatureFlagsService>;

  beforeEach(() => {
    featureFlagsServiceMock = sinon.createStubInstance(FeatureFlagsService);

    getSubscriberPreferences = new GetSubscriberPreferences(
      sinon.createStubInstance(GetSubscriberGlobalPreference) as any,
      sinon.createStubInstance(GetSubscriberPreference) as any,
      sinon.createStubInstance(SubscriberRepository) as any,
      sinon.createStubInstance(NotificationTemplateRepository) as any,
      sinon.createStubInstance(PreferencesRepository) as any,
      featureFlagsServiceMock as any,
      sinon.createStubInstance(InMemoryLRUCacheService) as any
    );
  });

  it('should throw ServiceUnavailableException when get preferences kill switch is enabled', async () => {
    featureFlagsServiceMock.getFlag.callsFake(async ({ key }) => {
      if (key === FeatureFlagsKeysEnum.IS_GET_PREFERENCES_DISABLED) {
        return true;
      }

      return false;
    });

    const command = GetSubscriberPreferencesCommand.create({
      organizationId: 'org-id',
      environmentId: 'env-id',
      subscriberId: 'subscriber-id',
    });

    try {
      await getSubscriberPreferences.execute(command);
      expect.fail('Expected ServiceUnavailableException to be thrown');
    } catch (error) {
      expect(error).to.be.instanceOf(ServiceUnavailableException);
      expect((error as ServiceUnavailableException).message).to.equal(
        'Get preferences service is currently unavailable'
      );
    }
  });
});
