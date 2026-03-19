import { Novu } from '@novu/api';
import {
  ContextRepository,
  JobRepository,
  MessageRepository,
  NotificationRepository,
  SubscriberEntity,
} from '@novu/dal';
import {
  ContextPayload,
  CreateWorkflowDto,
  StepTypeEnum,
  TriggerOverrides,
  TriggerRecipientSubscriber,
  TriggerTenantContext,
  WorkflowCreationSourceEnum,
  WorkflowResponseDto,
} from '@novu/shared';
import { SubscribersService, UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Context functionality - /v1/events/trigger (POST) #novu-v2', () => {
  let session: UserSession;
  let workflow: WorkflowResponseDto;
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;
  let novuClient: Novu;
  const contextRepository = new ContextRepository();
  const notificationRepository = new NotificationRepository();
  const messageRepository = new MessageRepository();
  const jobRepository = new JobRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdk(session);

    // Create V2 workflow for context testing
    const workflowBody: CreateWorkflowDto = {
      name: 'Test Context Workflow',
      workflowId: 'test-context-workflow',
      __source: WorkflowCreationSourceEnum.DASHBOARD,
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          name: 'Test Step',
          controlValues: {
            subject: 'Test Subject',
            body: 'Test Body {{subscriber.lastName}}',
          },
        },
        {
          type: StepTypeEnum.EMAIL,
          name: 'Email Step',
          controlValues: {
            subject: 'Email Subject {{subscriber.lastName}}',
            body: 'Email Body {{subscriber.lastName}}',
          },
        },
      ],
    };

    const workflowResponse = await session.testAgent.post('/v2/workflows').send(workflowBody);
    expect(workflowResponse.status).to.equal(201);
    workflow = workflowResponse.body.data;

    subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber();
  });

  afterEach(async () => {
    // Clean up contexts after each test
    await contextRepository.delete({
      _environmentId: session.environment._id,
    });
  });

  async function sendTrigger(
    workflowInner: WorkflowResponseDto,
    newSubscriberIdInAppNotification: string,
    payload: Record<string, unknown> = {},
    overrides: TriggerOverrides = {},
    tenant?: TriggerTenantContext,
    actor?: TriggerRecipientSubscriber,
    context?: ContextPayload
  ) {
    const triggerPayload = {
      workflowId: workflowInner.workflowId,
      to: [{ subscriberId: newSubscriberIdInAppNotification, lastName: 'Smith', email: 'test@email.novu' }],
      payload: {
        organizationName: 'Umbrella Corp',
        compiledVariable: 'test-env',
        ...payload,
      },
      overrides,
      tenant,
      actor,
      ...(context && { context }),
    } as Parameters<typeof novuClient.trigger>[0];

    const response = await novuClient.trigger(triggerPayload);

    // Validate standard response structure
    expect(response.result.status).to.equal('processed');
    expect(response.result.acknowledged).to.equal(true);

    return response;
  }

  it('should trigger event with various context formats', async () => {
    const context: ContextPayload = {
      app: 'jira',
      tenant: {
        id: 'org-acme',
        data: { name: 'Acme Corp', plan: 'enterprise' },
      },
      region: {
        id: 'us-east-1',
      },
    };

    await sendTrigger(workflow, subscriber.subscriberId, {}, {}, undefined, undefined, context);
    await session.waitForJobCompletion(workflow._id);

    // Verify all contexts were stored with correct data
    const contexts = await contextRepository.find({
      _environmentId: session.environment._id,
    });

    expect(contexts).to.have.length(3);

    const tenantContext = contexts.find((c) => c.type === 'tenant');
    const appContext = contexts.find((c) => c.type === 'app');
    const regionContext = contexts.find((c) => c.type === 'region');

    // Rich object with data
    expect(tenantContext?.id).to.equal('org-acme');
    expect(tenantContext?.data).to.deep.equal({ name: 'Acme Corp', plan: 'enterprise' });
    expect(tenantContext?.key).to.equal('tenant:org-acme');

    // String contexts (should have empty data)
    expect(appContext?.id).to.equal('jira');
    expect(appContext?.data).to.deep.equal({});
    expect(appContext?.key).to.equal('app:jira');

    // Rich object with empty data
    expect(regionContext?.id).to.equal('us-east-1');
    expect(regionContext?.data).to.deep.equal({});
    expect(regionContext?.key).to.equal('region:us-east-1');
  });

  it('should handle context find-or-create logic correctly (no updates)', async () => {
    const initialData = { name: 'Acme Corp', plan: 'basic' };
    const context1: ContextPayload = {
      tenant: {
        id: 'org-acme',
        data: initialData,
      },
    };

    await sendTrigger(workflow, subscriber.subscriberId, {}, {}, undefined, undefined, context1);

    await session.waitForJobCompletion(workflow._id);

    // Verify initial context was created
    let storedContext = await contextRepository.findOne({
      _environmentId: session.environment._id,
      type: 'tenant',
      id: 'org-acme',
    });

    expect(storedContext).to.be.ok;
    expect(storedContext?.data).to.deep.equal(initialData);

    // Second trigger with same type+id but as string (no data provided)
    const context2: ContextPayload = {
      tenant: 'org-acme',
    };

    await sendTrigger(workflow, subscriber.subscriberId, {}, {}, undefined, undefined, context2);
    await session.waitForJobCompletion(workflow._id);

    // Verify existing context was retrieved without updates
    storedContext = await contextRepository.findOne({
      _environmentId: session.environment._id,
      type: 'tenant',
      id: 'org-acme',
    });

    expect(storedContext?.data).to.deep.equal(initialData);

    // Third trigger with different data - should NOT update existing context
    // this is to prevent accidental updates and overwrites
    const attemptedUpdateData = { name: 'Acme Corporation', plan: 'enterprise', region: 'us-west' };
    const context3: ContextPayload = {
      tenant: {
        id: 'org-acme',
        data: attemptedUpdateData,
      },
    };

    await sendTrigger(workflow, subscriber.subscriberId, {}, {}, undefined, undefined, context3);

    await session.waitForJobCompletion(workflow._id);

    // Verify context was NOT updated - original data should remain
    const contexts = await contextRepository.find({
      _environmentId: session.environment._id,
      type: 'tenant',
      id: 'org-acme',
    });

    expect(contexts).to.have.length(1); // Still only one context
    expect(contexts[0].data).to.deep.equal(initialData); // Data should NOT be updated - original data preserved
  });

  it('should reject invalid context payload', async () => {
    const response = await session.testAgent
      .post('/v1/events/trigger')
      .send({
        name: workflow.workflowId,
        to: [{ subscriberId: subscriber.subscriberId }],
        payload: {},
        context: { tenant: { invalid: 'value' } },
      })
      .set('Authorization', `ApiKey ${session.apiKey}`)
      .expect(422);

    expect(response.body.message).to.be.a('string');
  });

  it('should not allow more than 5 contexts', async () => {
    const context: ContextPayload = {
      tenant: { id: 'org-acme' },
      app: { id: 'jira' },
      user: { id: 'john-doe' },
      country: { id: 'us' },
      region: { id: 'us-east-1' },
      device: { id: 'device-1' },
    };

    const response = await session.testAgent
      .post('/v1/events/trigger')
      .send({
        name: workflow.workflowId,
        to: [{ subscriberId: subscriber.subscriberId }],
        payload: {},
        context,
      })
      .set('Authorization', `ApiKey ${session.apiKey}`)
      .expect(422);

    expect(response.body.message).to.equal('Validation Error');
  });

  it('should store contextKeys in notification, message, and job entities', async () => {
    const context: ContextPayload = {
      tenant: {
        id: 'org-acme',
        data: { name: 'Acme Corp', plan: 'enterprise' },
      },
      app: 'jira',
      region: {
        id: 'us-east-1',
        data: { zone: 'availability-zone-1a' },
      },
    };

    await sendTrigger(workflow, subscriber.subscriberId, {}, {}, undefined, undefined, context);
    await session.waitForJobCompletion(workflow._id);

    // Verify contexts were created with correct keys
    const contexts = await contextRepository.find({
      _environmentId: session.environment._id,
    });

    expect(contexts).to.have.length(3);

    const expectedContextKeys = contexts.map((c) => c.key).sort();
    expect(expectedContextKeys).to.deep.equal(['app:jira', 'region:us-east-1', 'tenant:org-acme']);

    // Verify notification entity has contextKeys
    const notifications = await notificationRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
    });

    expect(notifications).to.have.length(1);
    const notification = notifications[0];
    expect(notification.contextKeys).to.be.an('array');
    expect(notification.contextKeys).to.have.length(3);
    expect(notification.contextKeys?.sort()).to.deep.equal(expectedContextKeys);

    // Verify message entities have contextKeys
    const messages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
    });

    expect(messages.length).to.be.greaterThan(0);

    // All messages should have the same contextKeys
    for (const message of messages) {
      expect(message.contextKeys).to.be.an('array');
      expect(message.contextKeys).to.have.length(3);
      expect(message.contextKeys?.sort()).to.deep.equal(expectedContextKeys);
    }

    // Verify job entities have contextKeys
    const jobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
    });

    expect(jobs.length).to.be.greaterThan(0);

    // All jobs should have the same contextKeys
    for (const job of jobs) {
      expect(job.contextKeys).to.be.an('array');
      expect(job.contextKeys).to.have.length(3);
      expect(job.contextKeys?.sort()).to.deep.equal(expectedContextKeys);
    }

    // Verify contextKeys match the actual context entities
    for (const contextKey of expectedContextKeys) {
      const [type, id] = contextKey.split(':');
      const contextEntity = contexts.find((c) => c.type === type && c.id === id);
      expect(contextEntity).to.be.ok;
      expect(contextEntity?.key).to.equal(contextKey);
    }
  });

  it('should handle contextKeys correctly when no context is provided', async () => {
    await sendTrigger(workflow, subscriber.subscriberId);
    await session.waitForJobCompletion(workflow._id);

    // Verify no contexts were created
    const contexts = await contextRepository.find({
      _environmentId: session.environment._id,
    });

    expect(contexts).to.have.length(0);

    // Verify notification entity has empty contextKeys array
    const notifications = await notificationRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
    });

    expect(notifications).to.have.length(1);
    const notification = notifications[0];
    expect(notification.contextKeys).to.be.an('array');
    expect(notification.contextKeys).to.have.length(0);

    // Verify message entities have empty contextKeys array
    const messages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
    });

    expect(messages.length).to.be.greaterThan(0);

    for (const message of messages) {
      expect(message.contextKeys).to.be.an('array');
      expect(message.contextKeys).to.have.length(0);
    }

    // Verify job entities have empty contextKeys array
    const jobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
    });

    expect(jobs.length).to.be.greaterThan(0);

    for (const job of jobs) {
      expect(job.contextKeys).to.be.an('array');
      expect(job.contextKeys).to.have.length(0);
    }
  });
});
