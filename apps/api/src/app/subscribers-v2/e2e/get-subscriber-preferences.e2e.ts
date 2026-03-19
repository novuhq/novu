import { Novu } from '@novu/api';
import { SubscriberResponseDto } from '@novu/api/models/components';
import { NotificationTemplateEntity } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { randomBytes } from 'crypto';
import { expectSdkExceptionGeneric, initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

let session: UserSession;

describe('Get Subscriber Preferences - /subscribers/:subscriberId/preferences (GET) #novu-v2', () => {
  let novuClient: Novu;
  let subscriber: SubscriberResponseDto;
  let workflow: NotificationTemplateEntity;

  beforeEach(async () => {
    (process.env as any).IS_CONTEXT_PREFERENCES_ENABLED = 'true';
    const uuid = randomBytes(4).toString('hex');
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdk(session);
    subscriber = await createSubscriberAndValidate(uuid);
    workflow = await session.createTemplate({
      noFeedId: true,
    });
  });

  afterEach(() => {
    delete (process.env as any).IS_CONTEXT_PREFERENCES_ENABLED;
  });

  it('should fetch subscriber preferences with default values', async () => {
    const response = await novuClient.subscribers.preferences.list({ subscriberId: subscriber.subscriberId });

    const { global, workflows } = response.result;

    expect(global.enabled).to.be.true;
    expect(workflows).to.be.an('array');
    expect(workflows).to.have.lengthOf(1);
  });

  it('should return 404 if subscriber does not exist', async () => {
    const invalidSubscriberId = `non-existent-${randomBytes(2).toString('hex')}`;
    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.subscribers.preferences.list({ subscriberId: invalidSubscriberId })
    );

    expect(error?.statusCode).to.equal(404);
  });

  it('should show all available workflowsin preferences response', async () => {
    // Create multiple templates
    const workflow2 = await session.createTemplate({ noFeedId: true });
    const workflow3 = await session.createTemplate({ noFeedId: true });

    const response = await novuClient.subscribers.preferences.list({ subscriberId: subscriber.subscriberId });

    const { workflows } = response.result;

    expect(workflows).to.have.lengthOf(3); // Should show all available workflows
    const workflowIdentifiers = workflows.map((_wf) => _wf.workflow.identifier);
    expect(workflowIdentifiers).to.include(workflow.triggers[0].identifier);
    expect(workflowIdentifiers).to.include(workflow2.triggers[0].identifier);
    expect(workflowIdentifiers).to.include(workflow3.triggers[0].identifier);
  });

  it('should inherit channel preferences from global settings when no workflow override exists', async () => {
    // First set global preferences
    await novuClient.subscribers.preferences.update(
      {
        channels: {
          email: false,
          inApp: true,
        },
      },
      subscriber.subscriberId
    );

    // Then create a new template
    const newWorkflow = await session.createTemplate({ noFeedId: true });

    // Check preferences
    const response = await novuClient.subscribers.preferences.list({ subscriberId: subscriber.subscriberId });

    const { workflows } = response.result;

    const newWorkflowPreferences = workflows.find(
      (_wf) => _wf.workflow.identifier === newWorkflow.triggers[0].identifier
    );
    // New workflow should inherit global settings
    expect(newWorkflowPreferences?.channels).to.deep.equal({ email: false, inApp: true });
  });

  it('should filter preferences by contextKeys', async () => {
    // Create preference for context A
    await novuClient.subscribers.preferences.update(
      {
        workflowId: workflow._id,
        channels: { email: false },
        context: { tenant: 'acme' },
      },
      subscriber.subscriberId
    );

    // Create preference for context B
    const workflow2 = await session.createTemplate({ noFeedId: true });
    await novuClient.subscribers.preferences.update(
      {
        workflowId: workflow2._id,
        channels: { email: false },
        context: { tenant: 'globex' },
      },
      subscriber.subscriberId
    );

    // List with context A filter
    const responseA = await novuClient.subscribers.preferences.list({
      subscriberId: subscriber.subscriberId,
      contextKeys: ['tenant:acme'],
    });

    // Should return BOTH workflows (all workflows always returned regardless of context)
    const workflowIdentifiers = responseA.result.workflows.map((w) => w.workflow.identifier);
    expect(workflowIdentifiers).to.include(workflow.triggers[0].identifier);
    expect(workflowIdentifiers).to.include(workflow2.triggers[0].identifier);

    // workflow1 uses tenant:acme preference (email: false)
    const wf1 = responseA.result.workflows.find((w) => w.workflow.identifier === workflow.triggers[0].identifier);
    expect(wf1?.channels.email).to.equal(false);

    // workflow2 falls back to global/default (email: true by default)
    const wf2 = responseA.result.workflows.find((w) => w.workflow.identifier === workflow2.triggers[0].identifier);
    expect(wf2?.channels.email).to.equal(true);
  });

  it('should return default preferences when no context-specific preference exists', async () => {
    // Create workflow preference for context A
    await novuClient.subscribers.preferences.update(
      {
        workflowId: workflow._id,
        channels: { email: false },
        context: { tenant: 'acme' },
      },
      subscriber.subscriberId
    );

    // List with different context B (no specific preference exists)
    const response = await novuClient.subscribers.preferences.list({
      subscriberId: subscriber.subscriberId,
      contextKeys: ['tenant:globex'],
    });

    // Should return workflow with default/inherited settings
    expect(response.result.workflows).to.have.lengthOf(1);
    // Default should be enabled
    expect(response.result.workflows[0].channels.email).to.equal(true);
  });

  it('should isolate preferences per context', async () => {
    // Set global preference for context B
    await novuClient.subscribers.preferences.update(
      {
        channels: { email: false, inApp: false },
        context: { tenant: 'globex' },
      },
      subscriber.subscriberId
    );

    // Create workflow preference for context A (override email)
    await novuClient.subscribers.preferences.update(
      {
        workflowId: workflow._id,
        channels: { email: true }, // Override to true
        context: { tenant: 'acme' },
      },
      subscriber.subscriberId
    );

    // List with context A - should see workflow override and default global
    const responseA = await novuClient.subscribers.preferences.list({
      subscriberId: subscriber.subscriberId,
      contextKeys: ['tenant:acme'],
    });
    expect(responseA.result.workflows[0].channels.email).to.equal(true);
    expect(responseA.result.global.channels.email).to.equal(true); // No global set for this context, uses default

    // List with context B - should see the global preference set for this context
    const responseB = await novuClient.subscribers.preferences.list({
      subscriberId: subscriber.subscriberId,
      contextKeys: ['tenant:globex'],
    });
    expect(responseB.result.global.channels.email).to.equal(false); // Global preference for tenant:globex
    expect(responseB.result.workflows[0].channels.email).to.equal(false); // Inherits from global
  });
});

async function createSubscriberAndValidate(id: string = '') {
  const payload = {
    subscriberId: `test-subscriber-${id}`,
    firstName: `Test ${id}`,
    lastName: 'Subscriber',
    email: `test-${id}@subscriber.com`,
    phone: '+1234567890',
  };

  const res = await session.testAgent.post(`/v1/subscribers`).send(payload);
  expect(res.status).to.equal(201);

  const subscriber = res.body.data;

  expect(subscriber.subscriberId).to.equal(payload.subscriberId);
  expect(subscriber.firstName).to.equal(payload.firstName);
  expect(subscriber.lastName).to.equal(payload.lastName);
  expect(subscriber.email).to.equal(payload.email);
  expect(subscriber.phone).to.equal(payload.phone);

  return subscriber;
}
