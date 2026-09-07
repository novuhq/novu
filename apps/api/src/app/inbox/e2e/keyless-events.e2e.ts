import {
  EnvironmentRepository,
  NotificationRepository,
  NotificationTemplateEntity,
  SubscriberRepository,
} from '@novu/dal';
import { StepTypeEnum, TriggerTypeEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { KEYLESS_ENVIRONMENT_PREFIX, KEYLESS_WORKFLOW_IDENTIFIER } from '../utils';

describe('Keyless Inbox Events - /inbox/events (POST) #novu-v2', async () => {
  let session: UserSession;
  let helloWorldTemplate: NotificationTemplateEntity;
  let otherTemplate: NotificationTemplateEntity;
  const subscriberRepository = new SubscriberRepository();
  const environmentRepository = new EnvironmentRepository();
  const notificationRepository = new NotificationRepository();

  /**
   * The endpoint only allows callers from a keyless environment, so simulate
   * one by re-stamping the freshly initialized session environment with the
   * keyless identifier prefix. The JWT references the environment's _id (not
   * its identifier) so the existing subscriber token continues to work.
   */
  const markEnvironmentAsKeyless = async () => {
    await environmentRepository.update(
      { _id: session.environment._id },
      { $set: { identifier: `${KEYLESS_ENVIRONMENT_PREFIX}${session.environment.identifier}` } }
    );
  };

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    helloWorldTemplate = await session.createTemplate({
      noFeedId: true,
      triggers: [
        {
          identifier: KEYLESS_WORKFLOW_IDENTIFIER,
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

    await markEnvironmentAsKeyless();
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
    expect(body.message).to.contain(KEYLESS_WORKFLOW_IDENTIFIER);
  });

  it('rejects requests targeting another subscriber id', async () => {
    const { status, body } = await triggerInboxEvent({
      name: KEYLESS_WORKFLOW_IDENTIFIER,
      to: { subscriberId: 'someone-else' },
      payload: {},
    });

    expect(status).to.equal(403);
    expect(body.message).to.contain('themselves');
  });

  it('rejects topic-based recipient payloads', async () => {
    const { status } = await triggerInboxEvent({
      name: KEYLESS_WORKFLOW_IDENTIFIER,
      to: { topicKey: 'all-users', type: 'Topic' },
      payload: {},
    });

    expect(status).to.equal(403);
  });

  it('rejects array-based recipient payloads', async () => {
    const { status } = await triggerInboxEvent({
      name: KEYLESS_WORKFLOW_IDENTIFIER,
      to: [{ subscriberId: session.subscriberId }, { subscriberId: 'someone-else' }],
      payload: {},
    });

    expect(status).to.equal(403);
  });

  it('rejects string recipient that does not match the authenticated subscriber id', async () => {
    const { status } = await triggerInboxEvent({
      name: KEYLESS_WORKFLOW_IDENTIFIER,
      to: 'another-subscriber',
      payload: {},
    });

    expect(status).to.equal(403);
  });

  it('rejects callers from a non-keyless environment even when the workflow id matches', async () => {
    // Restore the original (non-keyless) identifier so the env check fails.
    await environmentRepository.update(
      { _id: session.environment._id },
      { $set: { identifier: session.environment.identifier } }
    );

    const { status, body } = await triggerInboxEvent({
      name: KEYLESS_WORKFLOW_IDENTIFIER,
      to: { subscriberId: session.subscriberId },
      payload: {},
    });

    expect(status).to.equal(403);
    expect(body.message).to.contain('keyless');
  });

  it('triggers the hello-world workflow when the recipient is the authenticated subscriber', async () => {
    const { status, body } = await triggerInboxEvent({
      name: KEYLESS_WORKFLOW_IDENTIFIER,
      to: { subscriberId: session.subscriberId },
      payload: { foo: 'bar' },
    });

    expect(status).to.equal(201);
    expect(body.data).to.be.ok;

    await session.waitForJobCompletion(helloWorldTemplate._id);

    const subscriber = await subscriberRepository.findBySubscriberId(session.environment._id, session.subscriberId);
    expect(subscriber).to.be.ok;
  });

  it('ignores user-supplied bridgeUrl, controls, overrides, actor, tenant and transactionId fields', async () => {
    const attackerTransactionId = 'attacker-transaction-id';

    const { status } = await triggerInboxEvent({
      name: KEYLESS_WORKFLOW_IDENTIFIER,
      to: { subscriberId: session.subscriberId },
      payload: { foo: 'bar' },
      bridgeUrl: 'https://attacker.example.com/bridge',
      controls: { steps: { 'evil-step': { foo: 'bar' } } },
      overrides: { providers: { sendgrid: { templateId: 'attacker' } } },
      actor: 'someone-else',
      tenant: 'attacker-tenant',
      transactionId: attackerTransactionId,
    });

    expect(status).to.equal(201);
    await session.waitForJobCompletion(helloWorldTemplate._id);

    const notifications = await notificationRepository.find({
      _environmentId: session.environment._id,
      _templateId: helloWorldTemplate._id,
    });

    expect(notifications.length).to.be.greaterThan(0);

    for (const notification of notifications) {
      // The attacker-supplied transactionId is dropped server-side; the
      // controller assigns its own value. If the field were forwarded the
      // notification would be persisted with the attacker's id.
      expect(notification.transactionId).to.not.equal(attackerTransactionId);
    }
  });

  it('does not allow a subscriber-controlled bridgeUrl to drive an outbound bridge request', async () => {
    const attackerHost = 'attacker.example.com';
    let bridgeRequestUrl: string | undefined;
    const originalFetch = global.fetch;
    // Wrap fetch so that any bridge request triggered by `bridgeUrl` would be
    // observable in this test. After the route fix, no fetch should ever land
    // on the attacker-controlled host.
    global.fetch = (async (input: any, init?: any) => {
      const rawUrl = typeof input === 'string' ? input : input?.url;
      if (typeof rawUrl === 'string') {
        try {
          const parsed = new URL(rawUrl);
          if (parsed.hostname === attackerHost) {
            bridgeRequestUrl = rawUrl;
          }
        } catch {
          // ignore non-absolute URLs
        }
      }

      return originalFetch(input as any, init);
    }) as typeof global.fetch;

    try {
      const { status } = await triggerInboxEvent({
        name: KEYLESS_WORKFLOW_IDENTIFIER,
        to: { subscriberId: session.subscriberId },
        payload: { foo: 'bar' },
        bridgeUrl: `https://${attackerHost}/bridge`,
      });

      expect(status).to.equal(201);
      await session.waitForJobCompletion(helloWorldTemplate._id);

      expect(bridgeRequestUrl, 'attacker bridgeUrl must not trigger an outbound request').to.be.undefined;
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('rejects unauthenticated requests', async () => {
    const { status } = await session.testAgent.post('/v1/inbox/events').send({
      name: KEYLESS_WORKFLOW_IDENTIFIER,
      to: { subscriberId: session.subscriberId },
      payload: {},
    });

    expect(status).to.equal(401);
  });
});
