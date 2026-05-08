import { NotificationTemplateEntity, SubscriberRepository } from '@novu/dal';
import { StepTypeEnum, TriggerTypeEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Keyless Inbox Events - /inbox/events (POST) #novu-v2', async () => {
  let session: UserSession;
  let helloWorldTemplate: NotificationTemplateEntity;
  let otherTemplate: NotificationTemplateEntity;
  const subscriberRepository = new SubscriberRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    helloWorldTemplate = await session.createTemplate({
      noFeedId: true,
      triggers: [
        {
          identifier: 'hello-world',
          type: TriggerTypeEnum.EVENT,
          variables: [],
        },
      ],
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world keyless content',
        },
      ],
    });

    otherTemplate = await session.createTemplate({
      noFeedId: true,
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Some unrelated workflow',
        },
      ],
    });
  });

  const triggerInboxEvent = (body: Record<string, unknown>) =>
    session.testAgent.post('/v1/inbox/events').set('Authorization', `Bearer ${session.subscriberToken}`).send(body);

  it('rejects requests for any workflow other than the keyless hello-world workflow', async () => {
    const { status, body } = await triggerInboxEvent({
      name: otherTemplate.triggers[0].identifier,
      to: { subscriberId: session.subscriberId },
      payload: {},
    });

    expect(status).to.equal(403);
    expect(body.message).to.contain('hello-world');
  });

  it('rejects requests targeting another subscriber id', async () => {
    const { status, body } = await triggerInboxEvent({
      name: 'hello-world',
      to: { subscriberId: 'someone-else' },
      payload: {},
    });

    expect(status).to.equal(403);
    expect(body.message).to.contain('themselves');
  });

  it('rejects topic-based recipient payloads', async () => {
    const { status } = await triggerInboxEvent({
      name: 'hello-world',
      to: { topicKey: 'all-users', type: 'Topic' },
      payload: {},
    });

    expect(status).to.equal(403);
  });

  it('rejects array-based recipient payloads', async () => {
    const { status } = await triggerInboxEvent({
      name: 'hello-world',
      to: [{ subscriberId: session.subscriberId }, { subscriberId: 'someone-else' }],
      payload: {},
    });

    expect(status).to.equal(403);
  });

  it('rejects string recipient that does not match the authenticated subscriber id', async () => {
    const { status } = await triggerInboxEvent({
      name: 'hello-world',
      to: 'another-subscriber',
      payload: {},
    });

    expect(status).to.equal(403);
  });

  it('triggers the hello-world workflow when the recipient is the authenticated subscriber', async () => {
    const { status, body } = await triggerInboxEvent({
      name: 'hello-world',
      to: { subscriberId: session.subscriberId },
      payload: { foo: 'bar' },
    });

    expect(status).to.equal(201);
    expect(body.data).to.be.ok;

    await session.waitForJobCompletion(helloWorldTemplate._id);

    const subscriber = await subscriberRepository.findBySubscriberId(session.environment._id, session.subscriberId);
    expect(subscriber).to.be.ok;
  });

  it('ignores user-supplied bridgeUrl, controls, overrides, actor and tenant fields', async () => {
    const { status } = await triggerInboxEvent({
      name: 'hello-world',
      to: { subscriberId: session.subscriberId },
      payload: { foo: 'bar' },
      bridgeUrl: 'https://attacker.example.com/bridge',
      controls: { steps: { 'evil-step': { foo: 'bar' } } },
      overrides: { providers: { sendgrid: { templateId: 'attacker' } } },
      actor: 'someone-else',
      tenant: 'attacker-tenant',
      transactionId: 'attacker-transaction-id',
    });

    expect(status).to.equal(201);
    await session.waitForJobCompletion(helloWorldTemplate._id);
  });

  it('rejects unauthenticated requests', async () => {
    const { status } = await session.testAgent.post('/v1/inbox/events').send({
      name: 'hello-world',
      to: { subscriberId: session.subscriberId },
      payload: {},
    });

    expect(status).to.equal(401);
  });
});
