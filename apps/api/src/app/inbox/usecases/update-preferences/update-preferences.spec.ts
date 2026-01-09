import {
  FeatureFlagsService,
  GetSubscriberTemplatePreference,
  GetWorkflowByIdsUseCase,
  SendWebhookMessage,
  UpsertPreferences,
} from '@novu/application-generic';
import { PreferencesRepository, SubscriberRepository, TopicSubscribersRepository } from '@novu/dal';
import { PreferenceLevelEnum, SeverityLevelEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import {
  GetSubscriberGlobalPreference,
  GetSubscriberGlobalPreferenceCommand,
} from '../../../subscribers/usecases/get-subscriber-global-preference';
import { UpdatePreferences } from './update-preferences.usecase';

const mockedSubscriber: any = {
  _id: '6447aff3d89122e250412c29',
  subscriberId: 'test-mockSubscriber',
  firstName: 'test',
  lastName: 'test',
};

const mockedGlobalPreference: any = {
  preference: {
    enabled: true,
    channels: {
      email: true,
      in_app: true,
      sms: false,
      push: false,
      chat: true,
    },
  },
};

const mockedWorkflow: any = {
  _id: '6447aff3d89122e250412c28',
  name: 'test-workflow',
  critical: false,
  triggers: [{ identifier: 'test-trigger' }],
  tags: [],
  data: undefined,
  severity: SeverityLevelEnum.NONE,
};

describe('UpdatePreferences', () => {
  let updatePreferences: UpdatePreferences;
  let subscriberRepositoryMock: sinon.SinonStubbedInstance<SubscriberRepository>;
  let getSubscriberGlobalPreferenceMock: sinon.SinonStubbedInstance<GetSubscriberGlobalPreference>;
  let getSubscriberTemplatePreferenceUsecase: sinon.SinonStubbedInstance<GetSubscriberTemplatePreference>;
  let upsertPreferencesMock: sinon.SinonStubbedInstance<UpsertPreferences>;
  let getWorkflowByIdsUsecase: sinon.SinonStubbedInstance<GetWorkflowByIdsUseCase>;
  let sendWebhookMessageMock: sinon.SinonStubbedInstance<SendWebhookMessage>;
  let topicSubscribersRepositoryMock: sinon.SinonStubbedInstance<TopicSubscribersRepository>;
  let preferencesRepositoryMock: sinon.SinonStubbedInstance<PreferencesRepository>;
  let featureFlagsServiceMock: sinon.SinonStubbedInstance<FeatureFlagsService>;
  beforeEach(() => {
    subscriberRepositoryMock = sinon.createStubInstance(SubscriberRepository);
    getSubscriberGlobalPreferenceMock = sinon.createStubInstance(GetSubscriberGlobalPreference);
    getSubscriberTemplatePreferenceUsecase = sinon.createStubInstance(GetSubscriberTemplatePreference);
    upsertPreferencesMock = sinon.createStubInstance(UpsertPreferences);
    getWorkflowByIdsUsecase = sinon.createStubInstance(GetWorkflowByIdsUseCase);
    sendWebhookMessageMock = sinon.createStubInstance(SendWebhookMessage);
    topicSubscribersRepositoryMock = sinon.createStubInstance(TopicSubscribersRepository);
    preferencesRepositoryMock = sinon.createStubInstance(PreferencesRepository);
    featureFlagsServiceMock = sinon.createStubInstance(FeatureFlagsService);

    updatePreferences = new UpdatePreferences(
      subscriberRepositoryMock as any,
      getSubscriberGlobalPreferenceMock as any,
      getSubscriberTemplatePreferenceUsecase as any,
      upsertPreferencesMock as any,
      getWorkflowByIdsUsecase as any,
      sendWebhookMessageMock as any,
      topicSubscribersRepositoryMock as any,
      preferencesRepositoryMock as any,
      featureFlagsServiceMock as any
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should throw exception when subscriber is not found', async () => {
    const command = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'not-found',
      level: PreferenceLevelEnum.GLOBAL,
      chat: true,
      includeInactiveChannels: false,
    };

    subscriberRepositoryMock.findBySubscriberId.resolves(undefined);

    try {
      await updatePreferences.execute(command);
    } catch (error) {
      expect(error).to.be.instanceOf(Error);
      expect(error.message).to.equal(`Subscriber with id: ${command.subscriberId} is not found`);
    }
  });

  it('should update subscriber preference', async () => {
    const command = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'test-mockSubscriber',
      contextKeys: [],
      level: PreferenceLevelEnum.GLOBAL,
      chat: true,
      includeInactiveChannels: false,
    };

    subscriberRepositoryMock.findBySubscriberId.resolves(mockedSubscriber);
    getSubscriberGlobalPreferenceMock.execute.resolves(mockedGlobalPreference);

    const result = await updatePreferences.execute(command);

    expect(getSubscriberGlobalPreferenceMock.execute.called).to.be.true;
    expect(getSubscriberGlobalPreferenceMock.execute.lastCall.args).to.deep.equal([
      GetSubscriberGlobalPreferenceCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        subscriberId: mockedSubscriber.subscriberId,
        contextKeys: [],
        includeInactiveChannels: false,
      }),
    ]);

    expect(result).to.deep.equal({
      level: command.level,
      ...mockedGlobalPreference.preference,
    });
  });

  it('should update subscriber preference if preference exists and level is template', async () => {
    const command = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'test-mockSubscriber',
      level: PreferenceLevelEnum.TEMPLATE,
      workflowIdOrIdentifier: '6447aff3d89122e250412c28',
      chat: true,
      email: false,
      includeInactiveChannels: false,
    };

    subscriberRepositoryMock.findBySubscriberId.resolves(mockedSubscriber);
    getSubscriberTemplatePreferenceUsecase.execute.resolves({ ...mockedGlobalPreference });
    getWorkflowByIdsUsecase.execute.resolves(mockedWorkflow);

    const result = await updatePreferences.execute(command);

    expect(result).to.deep.equal({
      level: command.level,
      ...mockedGlobalPreference.preference,
      workflow: {
        id: mockedWorkflow._id,
        identifier: mockedWorkflow.triggers[0].identifier,
        name: mockedWorkflow.name,
        critical: mockedWorkflow.critical,
        tags: mockedWorkflow.tags,
        data: mockedWorkflow.data,
        severity: mockedWorkflow.severity,
      },
    });
  });

  it('should update subscriber preference when using workflow identifier', async () => {
    const command = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'test-mockSubscriber',
      level: PreferenceLevelEnum.TEMPLATE,
      workflowIdOrIdentifier: 'test-trigger', // Using the trigger identifier
      chat: true,
      email: false,
      includeInactiveChannels: false,
    };

    subscriberRepositoryMock.findBySubscriberId.resolves(mockedSubscriber);
    getSubscriberTemplatePreferenceUsecase.execute.resolves({ ...mockedGlobalPreference });
    getWorkflowByIdsUsecase.execute.resolves(mockedWorkflow);

    const result = await updatePreferences.execute(command);

    expect(result).to.deep.equal({
      level: command.level,
      ...mockedGlobalPreference.preference,
      workflow: {
        id: mockedWorkflow._id,
        identifier: mockedWorkflow.triggers[0].identifier,
        name: mockedWorkflow.name,
        critical: mockedWorkflow.critical,
        tags: mockedWorkflow.tags,
        data: mockedWorkflow.data,
        severity: mockedWorkflow.severity,
      },
    });
  });
});
