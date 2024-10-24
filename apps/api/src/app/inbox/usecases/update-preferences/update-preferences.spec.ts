import {
  AnalyticsService,
  GetSubscriberGlobalPreference,
  GetSubscriberTemplatePreference,
  GetSubscriberGlobalPreferenceCommand,
  UpsertPreferences,
} from '@novu/application-generic';
import { NotificationTemplateRepository, SubscriberPreferenceRepository, SubscriberRepository } from '@novu/dal';
import { PreferenceLevelEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { AnalyticsEventsEnum } from '../../utils';
import { UpdatePreferences } from './update-preferences.usecase';

const mockedSubscriber: any = {
  _id: '6447aff3d89122e250412c29',
  subscriberId: 'test-mockSubscriber',
  firstName: 'test',
  lastName: 'test',
};

const mockedSubscriberPreference: any = {
  _id: '123',
  subscriberId: 'test-mockSubscriber',
  level: 'global',
  enabled: true,
  channels: {
    email: true,
    in_app: true,
    sms: false,
    push: false,
    chat: true,
  },
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
};

describe('UpdatePreferences', () => {
  let updatePreferences: UpdatePreferences;
  let subscriberRepositoryMock: sinon.SinonStubbedInstance<SubscriberRepository>;
  let analyticsServiceMock: sinon.SinonStubbedInstance<AnalyticsService>;
  let notificationTemplateRepositoryMock: sinon.SinonStubbedInstance<NotificationTemplateRepository>;
  let subscriberPreferenceRepositoryMock: sinon.SinonStubbedInstance<SubscriberPreferenceRepository>;
  let getSubscriberGlobalPreferenceMock: sinon.SinonStubbedInstance<GetSubscriberGlobalPreference>;
  let getSubscriberTemplatePreferenceUsecase: sinon.SinonStubbedInstance<GetSubscriberTemplatePreference>;
  let upsertPreferencesMock: sinon.SinonStubbedInstance<UpsertPreferences>;

  beforeEach(() => {
    subscriberRepositoryMock = sinon.createStubInstance(SubscriberRepository);
    analyticsServiceMock = sinon.createStubInstance(AnalyticsService);
    notificationTemplateRepositoryMock = sinon.createStubInstance(NotificationTemplateRepository);
    subscriberPreferenceRepositoryMock = sinon.createStubInstance(SubscriberPreferenceRepository);
    getSubscriberGlobalPreferenceMock = sinon.createStubInstance(GetSubscriberGlobalPreference);
    getSubscriberTemplatePreferenceUsecase = sinon.createStubInstance(GetSubscriberTemplatePreference);
    upsertPreferencesMock = sinon.createStubInstance(UpsertPreferences);

    updatePreferences = new UpdatePreferences(
      subscriberPreferenceRepositoryMock as any,
      notificationTemplateRepositoryMock as any,
      subscriberRepositoryMock as any,
      analyticsServiceMock as any,
      getSubscriberGlobalPreferenceMock as any,
      getSubscriberTemplatePreferenceUsecase as any,
      upsertPreferencesMock as any
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
    };

    subscriberRepositoryMock.findBySubscriberId.resolves(undefined);

    try {
      await updatePreferences.execute(command);
    } catch (error) {
      expect(error).to.be.instanceOf(Error);
      expect(error.message).to.equal(`Subscriber with id: ${command.subscriberId} is not found`);
    }
  });

  it('should throw exception when workflow is not found', async () => {
    const command = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'test-mockSubscriber',
      level: PreferenceLevelEnum.TEMPLATE,
      chat: true,
      workflowId: 'not-found',
    };

    subscriberRepositoryMock.findBySubscriberId.resolves(mockedSubscriber);
    notificationTemplateRepositoryMock.findById.resolves(undefined);

    try {
      await updatePreferences.execute(command);
    } catch (error) {
      expect(error).to.be.instanceOf(Error);
      expect(error.message).to.equal(`Workflow with id: ${command.workflowId} is not found`);
    }
  });

  it('should create user preference if absent', async () => {
    const command = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'test-mockSubscriber',
      level: PreferenceLevelEnum.GLOBAL,
      chat: true,
    };

    subscriberRepositoryMock.findBySubscriberId.resolves(mockedSubscriber);
    subscriberPreferenceRepositoryMock.findOne.resolves(undefined);
    getSubscriberGlobalPreferenceMock.execute.resolves(mockedGlobalPreference);

    const result = await updatePreferences.execute(command);

    expect(getSubscriberGlobalPreferenceMock.execute.called).to.be.true;
    expect(getSubscriberGlobalPreferenceMock.execute.lastCall.args).to.deep.equal([
      GetSubscriberGlobalPreferenceCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        subscriberId: mockedSubscriber.subscriberId,
      }),
    ]);

    expect(analyticsServiceMock.mixpanelTrack.firstCall.args).to.deep.equal([
      AnalyticsEventsEnum.CREATE_PREFERENCES,
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

  it('should update user preference if preference exists', async () => {
    const command = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'test-mockSubscriber',
      level: PreferenceLevelEnum.GLOBAL,
      chat: true,
    };

    subscriberRepositoryMock.findBySubscriberId.resolves(mockedSubscriber);
    subscriberPreferenceRepositoryMock.findOne.resolves(mockedSubscriberPreference);
    getSubscriberGlobalPreferenceMock.execute.resolves(mockedGlobalPreference);

    const result = await updatePreferences.execute(command);

    expect(getSubscriberGlobalPreferenceMock.execute.called).to.be.true;
    expect(getSubscriberGlobalPreferenceMock.execute.lastCall.args).to.deep.equal([
      GetSubscriberGlobalPreferenceCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        subscriberId: mockedSubscriber.subscriberId,
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

  it('should update user preference if preference exists and level is template', async () => {
    const command = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'test-mockSubscriber',
      level: PreferenceLevelEnum.TEMPLATE,
      workflowId: '6447aff3d89122e250412c28',
      chat: true,
      email: false,
    };

    subscriberRepositoryMock.findBySubscriberId.resolves(mockedSubscriber);
    subscriberPreferenceRepositoryMock.findOne.resolves(mockedSubscriberPreference);
    getSubscriberTemplatePreferenceUsecase.execute.resolves({ ...mockedGlobalPreference });
    notificationTemplateRepositoryMock.findById.resolves(mockedWorkflow);

    const result = await updatePreferences.execute(command);

    expect(subscriberPreferenceRepositoryMock.create.calledOnce).to.be.false;
    expect(subscriberPreferenceRepositoryMock.update.calledOnce).to.be.true;
    expect(subscriberPreferenceRepositoryMock.update.firstCall.args).to.deep.equal([
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _subscriberId: mockedSubscriber._id,
        level: command.level,
        _templateId: command.workflowId,
      },
      {
        $set: {
          'channels.chat': true,
          'channels.email': false,
        },
      },
    ]);

    expect(analyticsServiceMock.mixpanelTrack.calledOnce).to.be.true;
    expect(analyticsServiceMock.mixpanelTrack.firstCall.args).to.deep.equal([
      AnalyticsEventsEnum.UPDATE_PREFERENCES,
      '',
      {
        _organization: command.organizationId,
        _subscriber: mockedSubscriber._id,
        _workflowId: command.workflowId,
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
      },
    });
  });
});
