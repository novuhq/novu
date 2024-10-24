import {
  AnalyticsService,
  GetSubscriberGlobalPreference,
  GetSubscriberGlobalPreferenceCommand,
  GetSubscriberPreference,
  GetSubscriberPreferenceCommand,
} from '@novu/application-generic';
import {
  ChannelTypeEnum,
  ISubscriberPreferenceResponse,
  ITemplateConfiguration,
  PreferenceLevelEnum,
  PreferenceOverrideSourceEnum,
  PreferencesTypeEnum,
  TriggerTypeEnum,
} from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { AnalyticsEventsEnum } from '../../utils';
import { GetInboxPreferences } from './get-inbox-preferences.usecase';

const mockedWorkflow = {
  _id: '123',
  name: 'workflow',
  triggers: [{ identifier: '123', type: TriggerTypeEnum.EVENT, variables: [] }],
  critical: false,
  tags: [],
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

  beforeEach(() => {
    getSubscriberPreferenceMock = sinon.createStubInstance(GetSubscriberPreference);
    analyticsServiceMock = sinon.createStubInstance(AnalyticsService);
    getSubscriberGlobalPreferenceMock = sinon.createStubInstance(GetSubscriberGlobalPreference);

    getInboxPreferences = new GetInboxPreferences(
      getSubscriberGlobalPreferenceMock as any,
      analyticsServiceMock as any,
      getSubscriberPreferenceMock as any
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  it('it should throw exception when subscriber is not found', async () => {
    const command = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'bad-subscriber-id',
    };

    getSubscriberGlobalPreferenceMock.execute.rejects(
      new Error(`Subscriber with id ${command.subscriberId} not found`)
    );

    try {
      await getInboxPreferences.execute(command);
    } catch (error) {
      expect(error).to.be.instanceOf(Error);
      expect(error.message).to.equal(`Subscriber with id ${command.subscriberId} not found`);
    }
  });

  it('it should return subscriber preferences', async () => {
    const command = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'test-mockSubscriber',
    };

    getSubscriberGlobalPreferenceMock.execute.resolves({
      preference: mockedGlobalPreferences,
    });
    getSubscriberPreferenceMock.execute.resolves([mockedWorkflowPreference]);

    const result = await getInboxPreferences.execute(command);

    expect(getSubscriberGlobalPreferenceMock.execute.calledOnce).to.be.true;
    expect(getSubscriberGlobalPreferenceMock.execute.firstCall.args[0]).to.deep.equal(
      GetSubscriberGlobalPreferenceCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        subscriberId: command.subscriberId,
      })
    );

    expect(getSubscriberPreferenceMock.execute.calledOnce).to.be.true;
    expect(getSubscriberPreferenceMock.execute.firstCall.args[0]).to.deep.equal(
      GetSubscriberPreferenceCommand.create({
        environmentId: command.environmentId,
        subscriberId: command.subscriberId,
        organizationId: command.organizationId,
      })
    );

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
        },
        preference: mockedWorkflowPreference.preference,
        type: PreferencesTypeEnum.USER_WORKFLOW,
      },
    ] satisfies ISubscriberPreferenceResponse[];
    const command = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'test-mockSubscriber',
      tags: ['newsletter', 'security'],
    };

    getSubscriberGlobalPreferenceMock.execute.resolves({
      preference: mockedGlobalPreferences,
    });
    getSubscriberPreferenceMock.execute.resolves(workflowsWithTags);

    const result = await getInboxPreferences.execute(command);

    expect(getSubscriberGlobalPreferenceMock.execute.calledOnce).to.be.true;
    expect(getSubscriberGlobalPreferenceMock.execute.firstCall.args[0]).to.deep.equal(
      GetSubscriberGlobalPreferenceCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        subscriberId: command.subscriberId,
      })
    );

    expect(getSubscriberPreferenceMock.execute.calledOnce).to.be.true;
    expect(getSubscriberPreferenceMock.execute.firstCall.args[0]).to.deep.equal(
      GetSubscriberPreferenceCommand.create({
        environmentId: command.environmentId,
        subscriberId: command.subscriberId,
        organizationId: command.organizationId,
      })
    );

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
        },
        ...mockedWorkflowPreference.preference,
      },
    ]);
  });
});
