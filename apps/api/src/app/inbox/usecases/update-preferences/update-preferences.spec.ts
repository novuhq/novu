import {
  AnalyticsService,
  GetSubscriberGlobalPreference,
  GetSubscriberTemplatePreference,
} from '@novu/application-generic';
import { NotificationTemplateRepository, SubscriberPreferenceRepository, SubscriberRepository } from '@novu/dal';
import { PreferenceLevelEnum } from '@novu/shared';
import { expect } from 'chai';
import { sub } from 'date-fns';
import sinon from 'sinon';
import { AnalyticsEventsEnum } from '../../utils';
import { UpdatePreferences } from './update-preferences.usecase';

const mockedSubscriber: any = { _id: '123', subscriberId: 'test-mockSubscriber', firstName: 'test', lastName: 'test' };
const mockedWorkflowPreference: any = {
  template: {},
  preference: {
    enabled: true,
    channels: {
      email: true,
      in_app: true,
      sms: false,
      push: false,
      chat: true,
    },
    overrides: {
      email: false,
      in_app: false,
      sms: true,
      push: true,
      chat: false,
    },
  },
};

const mockedGlobalPreferences: any = {
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

const mockedPreference: any = {
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

const mockedWorkflow: any = [{}];

describe('UpdatePreferences', () => {
  let updatePreferences: UpdatePreferences;
  let subscriberRepositoryMock: sinon.SinonStubbedInstance<SubscriberRepository>;
  let analyticsServiceMock: sinon.SinonStubbedInstance<AnalyticsService>;

  let notificationTemplateRepositoryMock: sinon.SinonStubbedInstance<NotificationTemplateRepository>;
  let subscriberPreferenceRepositoryMock: sinon.SinonStubbedInstance<SubscriberPreferenceRepository>;

  beforeEach(() => {
    subscriberRepositoryMock = sinon.createStubInstance(SubscriberRepository);
    analyticsServiceMock = sinon.createStubInstance(AnalyticsService);
    notificationTemplateRepositoryMock = sinon.createStubInstance(NotificationTemplateRepository);
    subscriberPreferenceRepositoryMock = sinon.createStubInstance(SubscriberPreferenceRepository);

    updatePreferences = new UpdatePreferences(
      subscriberPreferenceRepositoryMock as any,
      notificationTemplateRepositoryMock as any,
      subscriberRepositoryMock as any,
      analyticsServiceMock as any
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
    subscriberPreferenceRepositoryMock.findOne.onFirstCall().resolves(undefined);
    subscriberPreferenceRepositoryMock.findOne.onSecondCall().resolves(mockedPreference);

    await updatePreferences.execute(command);

    expect(subscriberPreferenceRepositoryMock.create.calledOnce).to.be.true;
    expect(subscriberPreferenceRepositoryMock.create.firstCall.args).to.deep.equal([
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _subscriberId: mockedSubscriber._id,
        enabled: true,
        channels: {
          chat: command.chat,
          email: undefined,
          sms: undefined,
          in_app: undefined,
          push: undefined,
        },
        level: command.level,
      },
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
          email: undefined,
          sms: undefined,
          in_app: undefined,
          push: undefined,
        },
        __source: 'UpdatePreferences',
      },
    ]);
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
    subscriberPreferenceRepositoryMock.findOne.resolves(mockedPreference);

    await updatePreferences.execute(command);

    expect(subscriberPreferenceRepositoryMock.create.calledOnce).to.be.false;
    expect(subscriberPreferenceRepositoryMock.update.calledOnce).to.be.true;
    expect(subscriberPreferenceRepositoryMock.update.firstCall.args).to.deep.equal([
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _subscriberId: mockedSubscriber._id,
        level: command.level,
      },
      {
        $set: {
          channels: {
            chat: true,
          },
        },
      },
    ]);
  });

  it('should update user preference if preference exists and level is template', async () => {
    const command = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'test-mockSubscriber',
      level: PreferenceLevelEnum.TEMPLATE,
      workflowId: 'workflow-1',
      chat: true,
      email: false,
    };

    subscriberRepositoryMock.findBySubscriberId.resolves(mockedSubscriber);
    subscriberPreferenceRepositoryMock.findOne.resolves(mockedPreference);
    notificationTemplateRepositoryMock.findById.resolves(mockedWorkflow);

    await updatePreferences.execute(command);

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
          channels: {
            chat: true,
            email: false,
          },
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
  });
});
