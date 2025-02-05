import { expect } from 'chai';
import { randomBytes } from 'crypto';
import { UserSession } from '@novu/testing';
import { NotificationTemplateEntity } from '@novu/dal';
import { SubscriberResponseDto } from '@novu/api/models/components';
import { Novu } from '@novu/api';
import { expectSdkExceptionGeneric, initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

let session: UserSession;

describe('Get Subscriber Preferences - /subscribers/:subscriberId/preferences (GET) #novu-v2', () => {
  let novuClient: Novu;
  let subscriber: SubscriberResponseDto;
  let workflow: NotificationTemplateEntity;

  beforeEach(async () => {
    const uuid = randomBytes(4).toString('hex');
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdk(session);
    subscriber = await createSubscriberAndValidate(uuid);
    workflow = await session.createTemplate({
      noFeedId: true,
    });
  });

  it('should fetch subscriber preferences with default values', async () => {
    const response = await novuClient.subscribers.preferences.retrieve(subscriber.subscriberId);

    const { global, workflows } = response.result;

    expect(global.enabled).to.be.true;
    expect(workflows).to.be.an('array');
    expect(workflows).to.have.lengthOf(1);
  });

  it('should return 404 if subscriber does not exist', async () => {
    const invalidSubscriberId = `non-existent-${randomBytes(2).toString('hex')}`;
    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.subscribers.preferences.retrieve(invalidSubscriberId)
    );

    expect(error?.statusCode).to.equal(404);
  });

  it('should show all available workflowsin preferences response', async () => {
    // Create multiple templates
    const workflow2 = await session.createTemplate({ noFeedId: true });
    const workflow3 = await session.createTemplate({ noFeedId: true });

    const response = await novuClient.subscribers.preferences.retrieve(subscriber.subscriberId);

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
    const response = await novuClient.subscribers.preferences.retrieve(subscriber.subscriberId);

    const { workflows } = response.result;

    const newWorkflowPreferences = workflows.find(
      (_wf) => _wf.workflow.identifier === newWorkflow.triggers[0].identifier
    );
    // New workflow should inherit global settings
    expect(newWorkflowPreferences?.channels).to.deep.equal({ email: false, inApp: true });
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
