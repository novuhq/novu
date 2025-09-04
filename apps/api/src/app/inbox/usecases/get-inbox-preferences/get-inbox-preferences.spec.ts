import { AnalyticsService } from '@novu/application-generic';
import { SubscriberRepository } from '@novu/dal';
import {
  ChannelTypeEnum,
  ISubscriberPreferenceResponse,
  ITemplateConfiguration,
  PreferenceLevelEnum,
  PreferenceOverrideSourceEnum,
  PreferencesTypeEnum,
  SeverityLevelEnum,
  TriggerTypeEnum,
  WorkflowCriticalityEnum,
} from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { GetSubscriberGlobalPreference } from '../../../subscribers/usecases/get-subscriber-global-preference';
import { GetSubscriberPreference } from '../../../subscribers/usecases/get-subscriber-preference';
import { GetInboxPreferencesCommand } from './get-inbox-preferences.command';
import { GetInboxPreferences } from './get-inbox-preferences.usecase';

const mockedWorkflow = {
  _id: '123',
  name: 'workflow',
  triggers: [{ identifier: '123', type: TriggerTypeEnum.EVENT, variables: [] }],
  critical: false,
  tags: [],
  createdAt: '2023-01-01T00:00:00.000Z',
  severity: SeverityLevelEnum.NONE,
} satisfies ITemplateConfiguration;
const mockedWorkflowPreference = {
  type: PreferencesTypeEnum.USER_WORKFLOW,
  template: mockedWorkflow,
  preference: {
    enabled: true,
    channels: {
      email: true,
      in_app: true,
      sms: false,
      push: false,
      chat: true,
    },
    overrides: [
      {
        channel: ChannelTypeEnum.EMAIL,
        source: PreferenceOverrideSourceEnum.SUBSCRIBER,
      },
    ],
  },
} satisfies ISubscriberPreferenceResponse;

const mockedGlobalPreferences = {
  enabled: true,
  channels: {
    email: true,
    in_app: true,
    sms: false,
    push: false,
    chat: true,
  },
};

describe('GetInboxPreferences', () => {
  let getInboxPreferences: GetInboxPreferences;

  let analyticsServiceMock: sinon.SinonStubbedInstance<AnalyticsService>;
  let getSubscriberGlobalPreferenceMock: sinon.SinonStubbedInstance<GetSubscriberGlobalPreference>;
  let getSubscriberPreferenceMock: sinon.SinonStubbedInstance<GetSubscriberPreference>;
  let subscriberRepositoryMock: sinon.SinonStubbedInstance<SubscriberRepository>;
  beforeEach(() => {
    getSubscriberPreferenceMock = sinon.createStubInstance(GetSubscriberPreference);
    analyticsServiceMock = sinon.createStubInstance(AnalyticsService);
    getSubscriberGlobalPreferenceMock = sinon.createStubInstance(GetSubscriberGlobalPreference);
    subscriberRepositoryMock = sinon.createStubInstance(SubscriberRepository);

    getInboxPreferences = new GetInboxPreferences(
      getSubscriberGlobalPreferenceMock as any,
      analyticsServiceMock as any,
      getSubscriberPreferenceMock as any,
      subscriberRepositoryMock as any
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  it('it should throw exception when subscriber is not found', async () => {
    const command = GetInboxPreferencesCommand.create({
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'bad-subscriber-id',
      criticality: WorkflowCriticalityEnum.NON_CRITICAL,
    });

    subscriberRepositoryMock.findBySubscriberId.resolves(null);

    try {
      await getInboxPreferences.execute(command);
    } catch (error) {
      expect(error).to.be.instanceOf(Error);
      expect(error.message).to.equal(`Subscriber ${command.subscriberId} not found`);
    }
  });

  it('it should return subscriber preferences', async () => {
    const command = GetInboxPreferencesCommand.create({
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'test-mockSubscriber',
      criticality: WorkflowCriticalityEnum.NON_CRITICAL,
    });

    subscriberRepositoryMock.findBySubscriberId.resolves({
      _id: 'test-mockSubscriber',
      subscriberId: 'test-mockSubscriber',
      firstName: 'test',
      lastName: 'test',
      email: 'test@test.com',
      _organizationId: 'org-1',
      _environmentId: 'env-1',
      deleted: false,
    } as any);

    getSubscriberGlobalPreferenceMock.execute.resolves({
      preference: mockedGlobalPreferences,
    });
    getSubscriberPreferenceMock.execute.resolves([mockedWorkflowPreference]);

    const result = await getInboxPreferences.execute(command);

    expect(getSubscriberGlobalPreferenceMock.execute.calledOnce).to.be.true;
    expect(getSubscriberGlobalPreferenceMock.execute.firstCall.args[0]).to.deep.equal({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      subscriberId: command.subscriberId,
      includeInactiveChannels: false,
      subscriber: {
        _id: 'test-mockSubscriber',
        subscriberId: 'test-mockSubscriber',
        firstName: 'test',
        lastName: 'test',
        email: 'test@test.com',
        _organizationId: 'org-1',
        _environmentId: 'env-1',
        deleted: false,
      },
    });

    expect(getSubscriberPreferenceMock.execute.calledOnce).to.be.true;
    expect(getSubscriberPreferenceMock.execute.firstCall.args[0]).to.deep.equal({
      environmentId: command.environmentId,
      subscriberId: command.subscriberId,
      organizationId: command.organizationId,
      tags: undefined,
      severity: undefined,
      includeInactiveChannels: false,
      criticality: command.criticality,
      subscriber: {
        _id: 'test-mockSubscriber',
        subscriberId: 'test-mockSubscriber',
        firstName: 'test',
        lastName: 'test',
        email: 'test@test.com',
        _organizationId: 'org-1',
        _environmentId: 'env-1',
        deleted: false,
      },
    });

    expect(result).to.deep.equal([
      {
        level: PreferenceLevelEnum.GLOBAL,
        ...mockedGlobalPreferences,
      },
      {
        ...mockedWorkflowPreference.preference,
        level: PreferenceLevelEnum.TEMPLATE,
        workflow: {
          id: mockedWorkflow._id,
          identifier: mockedWorkflow.triggers[0].identifier,
          name: mockedWorkflow.name,
          critical: mockedWorkflow.critical,
          tags: mockedWorkflow.tags,
          severity: mockedWorkflow.severity,
        },
      },
    ]);
  });

  it('it should return subscriber preferences filtered by tags', async () => {
    const workflowsWithTags = [
      {
        template: {
          _id: '111',
          name: 'workflow',
          triggers: [{ identifier: '111', type: TriggerTypeEnum.EVENT, variables: [] }],
          critical: false,
          tags: ['newsletter'],
          createdAt: '2023-01-01T00:00:00.000Z',
          severity: SeverityLevelEnum.HIGH,
        },
        preference: mockedWorkflowPreference.preference,
        type: PreferencesTypeEnum.USER_WORKFLOW,
      },
      {
        template: {
          _id: '222',
          name: 'workflow',
          triggers: [{ identifier: '222', type: TriggerTypeEnum.EVENT, variables: [] }],
          critical: false,
          tags: ['security'],
          createdAt: '2023-01-02T00:00:00.000Z',
          severity: SeverityLevelEnum.HIGH,
        },
        preference: mockedWorkflowPreference.preference,
        type: PreferencesTypeEnum.USER_WORKFLOW,
      },
    ] satisfies ISubscriberPreferenceResponse[];
    const command = GetInboxPreferencesCommand.create({
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'test-mockSubscriber',
      tags: ['newsletter', 'security'],
      severity: [SeverityLevelEnum.HIGH],
      criticality: WorkflowCriticalityEnum.NON_CRITICAL,
    });

    subscriberRepositoryMock.findBySubscriberId.resolves({
      _id: 'test-mockSubscriber',
      subscriberId: 'test-mockSubscriber',
      firstName: 'test',
      lastName: 'test',
      email: 'test@test.com',
      _organizationId: 'org-1',
      _environmentId: 'env-1',
      deleted: false,
    } as any);

    getSubscriberGlobalPreferenceMock.execute.resolves({
      preference: mockedGlobalPreferences,
    });
    getSubscriberPreferenceMock.execute.resolves(workflowsWithTags);

    const result = await getInboxPreferences.execute(command);

    expect(getSubscriberGlobalPreferenceMock.execute.calledOnce).to.be.true;
    expect(getSubscriberGlobalPreferenceMock.execute.firstCall.args[0]).to.deep.equal({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      subscriberId: command.subscriberId,
      includeInactiveChannels: false,
      subscriber: {
        _id: 'test-mockSubscriber',
        subscriberId: 'test-mockSubscriber',
        firstName: 'test',
        lastName: 'test',
        email: 'test@test.com',
        _organizationId: 'org-1',
        _environmentId: 'env-1',
        deleted: false,
      },
    });

    expect(getSubscriberPreferenceMock.execute.calledOnce).to.be.true;
    expect(getSubscriberPreferenceMock.execute.firstCall.args[0]).to.deep.equal({
      environmentId: command.environmentId,
      subscriberId: command.subscriberId,
      organizationId: command.organizationId,
      tags: command.tags,
      severity: command.severity,
      includeInactiveChannels: false,
      criticality: command.criticality,
      subscriber: {
        _id: 'test-mockSubscriber',
        subscriberId: 'test-mockSubscriber',
        firstName: 'test',
        lastName: 'test',
        email: 'test@test.com',
        _organizationId: 'org-1',
        _environmentId: 'env-1',
        deleted: false,
      },
    });

    expect(result).to.deep.equal([
      { level: PreferenceLevelEnum.GLOBAL, ...mockedGlobalPreferences },
      {
        level: PreferenceLevelEnum.TEMPLATE,
        workflow: {
          id: workflowsWithTags[0].template._id,
          identifier: workflowsWithTags[0].template.triggers[0].identifier,
          name: workflowsWithTags[0].template.name,
          critical: workflowsWithTags[0].template.critical,
          tags: workflowsWithTags[0].template.tags,
          severity: workflowsWithTags[0].template.severity,
        },
        ...mockedWorkflowPreference.preference,
      },
      {
        level: PreferenceLevelEnum.TEMPLATE,
        workflow: {
          id: workflowsWithTags[1].template._id,
          identifier: workflowsWithTags[1].template.triggers[0].identifier,
          name: workflowsWithTags[1].template.name,
          critical: workflowsWithTags[1].template.critical,
          tags: workflowsWithTags[1].template.tags,
          severity: workflowsWithTags[1].template.severity,
        },
        ...mockedWorkflowPreference.preference,
      },
    ]);
  });
});
