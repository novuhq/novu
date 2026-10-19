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

  it('should preserve preloaded entity references in preference commands', async () => {
    const subscriber = { _id: 'subscriber-internal-id' };
    const workflowList = [{ _id: 'workflow-id', triggers: [{ identifier: 'workflow-identifier' }] }];
    const subscriberGlobalPreference = { _id: 'preference-id' };
    const getSubscriberGlobalPreference = { execute: sinon.stub().resolves({ preference: {} }) };
    const getSubscriberPreference = { execute: sinon.stub().resolves([]) };
    const subscriberRepository = { findBySubscriberId: sinon.stub().resolves(subscriber) };
    const notificationTemplateRepository = { filterActive: sinon.stub() };
    const preferencesRepository = {
      buildContextExactMatchQuery: sinon.stub().returns({}),
      findOneForComputation: sinon.stub().resolves(subscriberGlobalPreference),
    };
    const featureFlagsService = { getFlag: sinon.stub().resolves(false) };
    const inMemoryLRUCacheService = { get: sinon.stub().resolves(workflowList) };
    const usecase = new GetSubscriberPreferences(
      getSubscriberGlobalPreference as any,
      getSubscriberPreference as any,
      subscriberRepository as any,
      notificationTemplateRepository as any,
      preferencesRepository as any,
      featureFlagsService as any,
      inMemoryLRUCacheService as any
    );
    const command = GetSubscriberPreferencesCommand.create({
      organizationId: 'organization-id',
      environmentId: 'environment-id',
      subscriberId: 'subscriber-id',
    });

    await usecase.execute(command);

    const globalPreferenceCommand = getSubscriberGlobalPreference.execute.firstCall.args[0];
    const workflowPreferenceCommand = getSubscriberPreference.execute.firstCall.args[0];

    expect(globalPreferenceCommand.subscriber).to.equal(subscriber);
    expect(globalPreferenceCommand.workflowList).to.equal(workflowList);
    expect(globalPreferenceCommand.subscriberGlobalPreference).to.equal(subscriberGlobalPreference);
    expect(workflowPreferenceCommand.subscriber).to.equal(subscriber);
    expect(workflowPreferenceCommand.workflowList).to.equal(workflowList);
    expect(workflowPreferenceCommand.subscriberGlobalPreference).to.equal(subscriberGlobalPreference);
  });
});
