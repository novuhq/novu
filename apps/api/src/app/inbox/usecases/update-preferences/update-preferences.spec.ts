import {
  AnalyticsService,
  GetSubscriberTemplatePreference,
  GetWorkflowByIdsUseCase,
  SendWebhookMessage,
  UpsertPreferences,
} from '@novu/application-generic';
import { SubscriberRepository } from '@novu/dal';
import { PreferenceLevelEnum, SeverityLevelEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import {
  GetSubscriberGlobalPreference,
  GetSubscriberGlobalPreferenceCommand,
} from '../../../subscribers/usecases/get-subscriber-global-preference';
import { AnalyticsEventsEnum } from '../../utils';
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
  let analyticsServiceMock: sinon.SinonStubbedInstance<AnalyticsService>;
  let getSubscriberGlobalPreferenceMock: sinon.SinonStubbedInstance<GetSubscriberGlobalPreference>;
  let getSubscriberTemplatePreferenceUsecase: sinon.SinonStubbedInstance<GetSubscriberTemplatePreference>;
  let upsertPreferencesMock: sinon.SinonStubbedInstance<UpsertPreferences>;
  let getWorkflowByIdsUsecase: sinon.SinonStubbedInstance<GetWorkflowByIdsUseCase>;
  let sendWebhookMessageMock: sinon.SinonStubbedInstance<SendWebhookMessage>;

  beforeEach(() => {
    subscriberRepositoryMock = sinon.createStubInstance(SubscriberRepository);
    analyticsServiceMock = sinon.createStubInstance(AnalyticsService);
    getSubscriberGlobalPreferenceMock = sinon.createStubInstance(GetSubscriberGlobalPreference);
    getSubscriberTemplatePreferenceUsecase = sinon.createStubInstance(GetSubscriberTemplatePreference);
    upsertPreferencesMock = sinon.createStubInstance(UpsertPreferences);
    getWorkflowByIdsUsecase = sinon.createStubInstance(GetWorkflowByIdsUseCase);
    sendWebhookMessageMock = sinon.createStubInstance(SendWebhookMessage);

    updatePreferences = new UpdatePreferences(
      subscriberRepositoryMock as any,
      analyticsServiceMock as any,
      getSubscriberGlobalPreferenceMock as any,
      getSubscriberTemplatePreferenceUsecase as any,
      upsertPreferencesMock as any,
      getWorkflowByIdsUsecase as any,
      sendWebhookMessageMock as any
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
        includeInactiveChannels: false,
      }),
    ]);

    expect(analyticsServiceMock.mixpanelTrack.firstCall.args).to.deep.equal([
      AnalyticsEventsEnum.UPDATE_PREFERENCES,
      '',
      {
        _organization: command.organizationId,
        _subscriber: mockedSubscriber._id,
        level: command.level,
        _workflowId: undefined,
        channels: {
          chat: true,
        },
      },
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

    expect(analyticsServiceMock.mixpanelTrack.calledOnce).to.be.true;
    expect(analyticsServiceMock.mixpanelTrack.firstCall.args).to.deep.equal([
      AnalyticsEventsEnum.UPDATE_PREFERENCES,
      '',
      {
        _organization: command.organizationId,
        _subscriber: mockedSubscriber._id,
        _workflowId: command.workflowIdOrIdentifier,
        level: command.level,
        channels: {
          chat: true,
          email: false,
        },
      },
    ]);

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

    expect(analyticsServiceMock.mixpanelTrack.calledOnce).to.be.true;
    expect(analyticsServiceMock.mixpanelTrack.firstCall.args).to.deep.equal([
      AnalyticsEventsEnum.UPDATE_PREFERENCES,
      '',
      {
        _organization: command.organizationId,
        _subscriber: mockedSubscriber._id,
        _workflowId: command.workflowIdOrIdentifier,
        level: command.level,
        channels: {
          chat: true,
          email: false,
        },
      },
    ]);

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
