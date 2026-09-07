import { Novu } from '@novu/api';
import { DetailEnum } from '@novu/application-generic';
import {
  ExecutionDetailsRepository,
  MessageRepository,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  PreferencesRepository,
  SubscriberEntity,
} from '@novu/dal';
import { PreferencesTypeEnum, StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { SubscribersService, UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Trigger event with preferences - /v1/events/trigger (POST) #novu-v2', () => {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;
  const messageRepository = new MessageRepository();
  const executionDetailsRepository = new ExecutionDetailsRepository();
  const preferencesRepository = new PreferencesRepository();
  const notificationTemplateRepository = new NotificationTemplateRepository();
  let novuClient: Novu;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber();
    novuClient = initNovuClassSdk(session);
  });

  it('should deliver in-app notification when subscriber preferences allow it', async () => {
    const { result: workflow } = await novuClient.workflows.create({
      name: 'Test Workflow - Allow Preferences',
      workflowId: `test-workflow-allow-${Date.now()}`,
      source: WorkflowCreationSourceEnum.EDITOR,
      active: true,
      steps: [
        {
          name: 'In-App Step',
          type: StepTypeEnum.IN_APP,
          controlValues: {
            body: 'Test in-app notification content',
          },
        },
      ],
    });

    template = (await notificationTemplateRepository.findById(
      workflow.id,
      session.environment._id
    )) as NotificationTemplateEntity;

    await novuClient.trigger({
      workflowId: workflow.workflowId,
      to: [subscriber.subscriberId],
      payload: {
        message: 'Test message',
      },
    });

    await session.waitForJobCompletion(template._id);

    const messages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.IN_APP,
    });

    expect(messages.length).to.equal(1);
    expect(messages[0].content).to.equal('Test in-app notification content');

    const executionDetailsFiltered = await executionDetailsRepository.find({
      _environmentId: session.environment._id,
      _notificationTemplateId: template._id,
      detail: DetailEnum.STEP_FILTERED_BY_SUBSCRIBER_WORKFLOW_PREFERENCES,
    });

    expect(executionDetailsFiltered.length).to.equal(0);
  });

  it('should skip in-app notification when subscriber disables in-app channel for workflow', async () => {
    const { result: workflow } = await novuClient.workflows.create({
      name: 'Test Workflow - Disable Preferences',
      workflowId: `test-workflow-disable-${Date.now()}`,
      source: WorkflowCreationSourceEnum.EDITOR,
      active: true,
      steps: [
        {
          name: 'In-App Step',
          type: StepTypeEnum.IN_APP,
          controlValues: {
            body: 'Test in-app notification content',
          },
        },
      ],
    });

    template = (await notificationTemplateRepository.findById(
      workflow.id,
      session.environment._id
    )) as NotificationTemplateEntity;

    await novuClient.subscribers.preferences.update(
      {
        workflowId: workflow.workflowId,
        channels: {
          inApp: false,
        },
      },
      subscriber.subscriberId
    );

    await novuClient.trigger({
      workflowId: workflow.workflowId,
      to: [subscriber.subscriberId],
      payload: {
        message: 'Test message',
      },
    });

    await session.waitForJobCompletion(template._id);

    const messages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.IN_APP,
    });

    expect(messages.length).to.equal(0);

    const executionDetails = await executionDetailsRepository.find({
      _environmentId: session.environment._id,
      _notificationTemplateId: template._id,
      detail: DetailEnum.STEP_FILTERED_BY_SUBSCRIBER_WORKFLOW_PREFERENCES,
    });

    expect(executionDetails.length).to.equal(1);
  });

  it('should deliver in-app notification when subscriber enables channel despite workflow having all channels disabled by default', async () => {
    const { result: workflow } = await novuClient.workflows.create({
      name: 'Test Workflow - Disabled Defaults',
      workflowId: `test-workflow-disabled-${Date.now()}`,
      source: WorkflowCreationSourceEnum.EDITOR,
      active: true,
      steps: [
        {
          name: 'In-App Step',
          type: StepTypeEnum.IN_APP,
          controlValues: {
            body: 'Test in-app notification with disabled workflow defaults',
          },
        },
      ],
      preferences: {
        user: {
          all: {
            enabled: false,
            readOnly: false,
          },
          channels: {
            in_app: {
              enabled: false,
            },
            email: {
              enabled: false,
            },
            sms: {
              enabled: false,
            },
            push: {
              enabled: false,
            },
            chat: {
              enabled: false,
            },
          },
        },
      },
    });

    template = (await notificationTemplateRepository.findById(
      workflow.id,
      session.environment._id
    )) as NotificationTemplateEntity;

    await novuClient.subscribers.preferences.update(
      {
        workflowId: workflow.workflowId,
        channels: {
          inApp: true,
        },
      },
      subscriber.subscriberId
    );

    const subscriberWorkflowPreference = await preferencesRepository.findOne({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      _subscriberId: subscriber._id,
      _templateId: template._id,
      type: PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
    });

    expect(subscriberWorkflowPreference).to.exist;

    await preferencesRepository.update(
      {
        _id: subscriberWorkflowPreference!._id,
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
      },
      {
        $unset: { 'preferences.all': '' },
      }
    );

    await novuClient.trigger({
      workflowId: workflow.workflowId,
      to: [subscriber.subscriberId],
      payload: {
        message: 'Test message',
      },
    });

    await session.waitForJobCompletion(template._id);

    const messages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.IN_APP,
    });

    expect(messages.length).to.equal(1);
    expect(messages[0].content).to.equal('Test in-app notification with disabled workflow defaults');

    const executionDetailsFiltered = await executionDetailsRepository.find({
      _environmentId: session.environment._id,
      _notificationTemplateId: template._id,
      detail: DetailEnum.STEP_FILTERED_BY_SUBSCRIBER_WORKFLOW_PREFERENCES,
    });

    expect(executionDetailsFiltered.length).to.equal(0);
  });

  it('should not deliver in-app notification when workflow has all channels disabled by default and no subscriber overrides', async () => {
    const { result: workflow } = await novuClient.workflows.create({
      name: 'Test Workflow - Disabled Defaults No Override',
      workflowId: `test-workflow-disabled-no-override-${Date.now()}`,
      source: WorkflowCreationSourceEnum.EDITOR,
      active: true,
      steps: [
        {
          name: 'In-App Step',
          type: StepTypeEnum.IN_APP,
          controlValues: {
            body: 'Test in-app notification that should not be delivered',
          },
        },
      ],
      preferences: {
        user: {
          all: {
            enabled: false,
            readOnly: false,
          },
          channels: {
            in_app: {
              enabled: false,
            },
            email: {
              enabled: false,
            },
            sms: {
              enabled: false,
            },
            push: {
              enabled: false,
            },
            chat: {
              enabled: false,
            },
          },
        },
      },
    });

    template = (await notificationTemplateRepository.findById(
      workflow.id,
      session.environment._id
    )) as NotificationTemplateEntity;

    await novuClient.trigger({
      workflowId: workflow.workflowId,
      to: [subscriber.subscriberId],
      payload: {
        message: 'Test message',
      },
    });

    await session.waitForJobCompletion(template._id);

    const messages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.IN_APP,
    });

    expect(messages.length).to.equal(0);

    const executionDetails = await executionDetailsRepository.find({
      _environmentId: session.environment._id,
      _notificationTemplateId: template._id,
      _subscriberId: subscriber._id,
      detail: DetailEnum.STEP_FILTERED_BY_USER_WORKFLOW_PREFERENCES,
    });

    expect(executionDetails.length).to.equal(1);
  });
});
