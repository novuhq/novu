import {
  AnalyticsService,
  GetSubscriberGlobalPreference,
  GetSubscriberTemplatePreference,
} from '@novu/application-generic';
import { NotificationTemplateRepository, SubscriberRepository } from '@novu/dal';
import { PreferenceLevelEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { AnalyticsEventsEnum } from '../../utils';
import { GetPreferences } from './get-preferences.usecase';

const mockedSubscriber: any = { _id: '123', subscriberId: 'test-mockSubscriber', firstName: 'test', lastName: 'test' };
const mockedWorkflow = {
  _id: '123',
  name: 'workflow',
  triggers: [{ identifier: '123' }],
  critical: false,
  tags: [],
};
const mockedWorkflowPreference: any = {
  template: {},

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
};

const mockedGlobalPreferences: any = {
  enabled: true,
  channels: {
    email: true,
    in_app: true,
    sms: false,
    push: false,
    chat: true,
  },
};
const mockedPreferencesResponse: any = [
  { level: PreferenceLevelEnum.GLOBAL, ...mockedGlobalPreferences.preference },
  {
    level: PreferenceLevelEnum.TEMPLATE,
    workflow: {
      id: mockedWorkflow._id,
      identifier: mockedWorkflow.triggers[0].identifier,
      name: mockedWorkflow.name,
      critical: mockedWorkflow.critical,
      tags: mockedWorkflow.tags,
    },
    ...mockedWorkflowPreference.preference,
  },
];

const mockedWorkflows: any = [
  {
    _id: '123',
    name: 'workflow',
    triggers: [{ identifier: '123' }],
    critical: false,
    tags: [],
  },
];

describe('GetPreferences', () => {
  let getPreferences: GetPreferences;
  let subscriberRepositoryMock: sinon.SinonStubbedInstance<SubscriberRepository>;
  let getSubscriberWorkflowMock: sinon.SinonStubbedInstance<GetSubscriberTemplatePreference>;
  let analyticsServiceMock: sinon.SinonStubbedInstance<AnalyticsService>;
  let getSubscriberGlobalPreferenceMock: sinon.SinonStubbedInstance<GetSubscriberGlobalPreference>;
  let notificationTemplateRepositoryMock: sinon.SinonStubbedInstance<NotificationTemplateRepository>;

  beforeEach(() => {
    subscriberRepositoryMock = sinon.createStubInstance(SubscriberRepository);
    getSubscriberWorkflowMock = sinon.createStubInstance(GetSubscriberTemplatePreference);
    analyticsServiceMock = sinon.createStubInstance(AnalyticsService);
    getSubscriberGlobalPreferenceMock = sinon.createStubInstance(GetSubscriberGlobalPreference);
    notificationTemplateRepositoryMock = sinon.createStubInstance(NotificationTemplateRepository);

    getPreferences = new GetPreferences(
      subscriberRepositoryMock as any,
      notificationTemplateRepositoryMock as any,
      getSubscriberWorkflowMock as any,
      getSubscriberGlobalPreferenceMock as any,
      analyticsServiceMock as any
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  it('it should throw exception when subscriber is not found', async () => {
    const command = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'not-found',
    };

    subscriberRepositoryMock.findOne.resolves(undefined);

    try {
      await getPreferences.execute(command);
    } catch (error) {
      expect(error).to.be.instanceOf(Error);
      expect(error.message).to.equal(`Subscriber with id: ${command.subscriberId} not found`);
    }
  });

  it('it should return subscriber preferences', async () => {
    const command = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'test-mockSubscriber',
    };

    subscriberRepositoryMock.findBySubscriberId.resolves(mockedSubscriber);
    getSubscriberGlobalPreferenceMock.execute.resolves(mockedGlobalPreferences);
    notificationTemplateRepositoryMock.filterActive.resolves(mockedWorkflows);
    getSubscriberWorkflowMock.execute.resolves(mockedWorkflowPreference);

    const result = await getPreferences.execute(command);

    expect(subscriberRepositoryMock.findBySubscriberId.calledOnce).to.be.true;
    expect(subscriberRepositoryMock.findBySubscriberId.firstCall.args).to.deep.equal([
      command.environmentId,
      command.subscriberId,
    ]);
    expect(getSubscriberGlobalPreferenceMock.execute.calledOnce).to.be.true;
    expect(getSubscriberGlobalPreferenceMock.execute.firstCall.args).to.deep.equal([command]);
    expect(notificationTemplateRepositoryMock.filterActive.calledOnce).to.be.true;
    expect(notificationTemplateRepositoryMock.filterActive.firstCall.args).to.deep.equal([
      {
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        tags: undefined,
      },
    ]);
    expect(getSubscriberWorkflowMock.execute.calledOnce).to.be.true;
    expect(getSubscriberWorkflowMock.execute.firstCall.args).to.deep.equal([
      {
        organizationId: command.organizationId,
        subscriberId: command.subscriberId,
        environmentId: command.environmentId,
        template: mockedWorkflow,
        subscriber: mockedSubscriber,
      },
    ]);

    expect(analyticsServiceMock.mixpanelTrack.calledOnce).to.be.true;
    expect(analyticsServiceMock.mixpanelTrack.firstCall.args).to.deep.equal([
      AnalyticsEventsEnum.FETCH_PREFERENCES,
      '',
      {
        _organization: command.organizationId,
        subscriberId: command.subscriberId,
        workflowSize: 1,
      },
    ]);

    expect(result).to.deep.equal(mockedPreferencesResponse);
  });

  it('it should return subscriber preferences filtered by tags', async () => {
    const workflowsWithTags: any = [
      {
        _id: '111',
        name: 'workflow',
        triggers: [{ identifier: '111' }],
        critical: false,
        tags: ['newsletter'],
      },
      {
        _id: '222',
        name: 'workflow',
        triggers: [{ identifier: '222' }],
        critical: false,
        tags: ['security'],
      },
    ];
    const response: any = [
      { level: PreferenceLevelEnum.GLOBAL, ...mockedGlobalPreferences.preference },
      {
        level: PreferenceLevelEnum.TEMPLATE,
        workflow: {
          id: workflowsWithTags[0]._id,
          identifier: workflowsWithTags[0].triggers[0].identifier,
          name: workflowsWithTags[0].name,
          critical: workflowsWithTags[0].critical,
          tags: workflowsWithTags[0].tags,
        },
        ...mockedWorkflowPreference.preference,
      },
      {
        level: PreferenceLevelEnum.TEMPLATE,
        workflow: {
          id: workflowsWithTags[1]._id,
          identifier: workflowsWithTags[1].triggers[0].identifier,
          name: workflowsWithTags[1].name,
          critical: workflowsWithTags[1].critical,
          tags: workflowsWithTags[1].tags,
        },
        ...mockedWorkflowPreference.preference,
      },
    ];
    const command = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'test-mockSubscriber',
      tags: ['newsletter', 'security'],
    };

    subscriberRepositoryMock.findBySubscriberId.resolves(mockedSubscriber);
    getSubscriberGlobalPreferenceMock.execute.resolves(mockedGlobalPreferences);
    notificationTemplateRepositoryMock.filterActive.resolves(workflowsWithTags);
    getSubscriberWorkflowMock.execute.resolves(mockedWorkflowPreference);

    const result = await getPreferences.execute(command);

    expect(subscriberRepositoryMock.findBySubscriberId.calledOnce).to.be.true;
    expect(subscriberRepositoryMock.findBySubscriberId.firstCall.args).to.deep.equal([
      command.environmentId,
      command.subscriberId,
    ]);
    expect(getSubscriberGlobalPreferenceMock.execute.calledOnce).to.be.true;
    expect(getSubscriberGlobalPreferenceMock.execute.firstCall.args).to.deep.equal([
      {
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        subscriberId: command.subscriberId,
      },
    ]);
    expect(notificationTemplateRepositoryMock.filterActive.calledOnce).to.be.true;
    expect(notificationTemplateRepositoryMock.filterActive.firstCall.args).to.deep.equal([
      {
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        tags: command.tags,
      },
    ]);
    expect(getSubscriberWorkflowMock.execute.calledTwice).to.be.true;
    expect(getSubscriberWorkflowMock.execute.firstCall.args).to.deep.equal([
      {
        organizationId: command.organizationId,
        subscriberId: command.subscriberId,
        environmentId: command.environmentId,
        template: workflowsWithTags[0],
        subscriber: mockedSubscriber,
      },
    ]);
    expect(getSubscriberWorkflowMock.execute.secondCall.args).to.deep.equal([
      {
        organizationId: command.organizationId,
        subscriberId: command.subscriberId,
        environmentId: command.environmentId,
        template: workflowsWithTags[1],
        subscriber: mockedSubscriber,
      },
    ]);

    expect(analyticsServiceMock.mixpanelTrack.calledOnce).to.be.true;
    expect(analyticsServiceMock.mixpanelTrack.firstCall.args).to.deep.equal([
      AnalyticsEventsEnum.FETCH_PREFERENCES,
      '',
      {
        _organization: command.organizationId,
        subscriberId: command.subscriberId,
        workflowSize: 2,
      },
    ]);

    expect(result).to.deep.equal(response);
  });
});
