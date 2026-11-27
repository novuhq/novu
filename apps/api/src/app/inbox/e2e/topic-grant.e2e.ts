import { IntegrationRepository, TopicRepository } from '@novu/dal';
import { ChannelTypeEnum, InAppProviderIdEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

const integrationRepository = new IntegrationRepository();
const topicRepository = new TopicRepository();

const INVALID_GRANT = { statusCode: 403, error: 'topic_grant_invalid' };

describe('Subscribe with a topic grant - /inbox/topics/:topicKey/subscriptions (POST) #novu-v2', () => {
  let session: UserSession;
  let sessionToken: string;
  let previousFlag: string | undefined;

  beforeEach(async () => {
    previousFlag = process.env.IS_SUBSCRIBER_TOKENS_ENABLED;
    process.env.IS_SUBSCRIBER_TOKENS_ENABLED = 'true';
    session = new UserSession();
    await session.initialize();
    await setHmac(session);
    sessionToken = await inboxSession(session, 'sub-ada');
  });

  afterEach(() => {
    if (previousFlag === undefined) {
      delete process.env.IS_SUBSCRIBER_TOKENS_ENABLED;
    } else {
      process.env.IS_SUBSCRIBER_TOKENS_ENABLED = previousFlag;
    }
  });

  function subscribe(topicKey: string, body: Record<string, unknown>, token = sessionToken) {
    return session.testAgent
      .post(`/v1/inbox/topics/${topicKey}/subscriptions`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  }

  it('should subscribe with a grant for this subscriber and topic, and accept the same grant again', async () => {
    const topicGrant = await mint(session, 'sub-ada', { topic: 'ticket:1' });

    const first = await subscribe('ticket:1', { topicGrant, identifier: 'first' });
    const second = await subscribe('ticket:1', { topicGrant, identifier: 'second' });

    expect(first.status, JSON.stringify(first.body)).to.equal(201);
    expect(first.body.data.identifier).to.equal('first');
    expect(second.status, JSON.stringify(second.body)).to.equal(201);
    expect(second.body.data.identifier).to.equal('second');
  });

  it('should create a missing topic with its key only, ignoring the topic name from the browser', async () => {
    const topicGrant = await mint(session, 'sub-ada', { topic: 'ticket:new' });

    const res = await subscribe('ticket:new', { topicGrant, topic: { name: 'Chosen by the browser' } });

    expect(res.status, JSON.stringify(res.body)).to.equal(201);
    const topic = await topicRepository.findTopicByKey('ticket:new', session.organization._id, session.environment._id);
    expect(topic?.key).to.equal('ticket:new');
    expect(topic?.name).to.equal(undefined);
  });

  it('should refuse a grant for another topic', async () => {
    const topicGrant = await mint(session, 'sub-ada', { topic: 'ticket:2' });

    const res = await subscribe('ticket:1', { topicGrant });

    expect(res.status).to.equal(403);
    expect(res.body).to.include(INVALID_GRANT);
  });

  it('should refuse a grant for another subscriber', async () => {
    const topicGrant = await mint(session, 'sub-mallory', { topic: 'ticket:1' });

    const res = await subscribe('ticket:1', { topicGrant });

    expect(res.status).to.equal(403);
    expect(res.body).to.include(INVALID_GRANT);
  });

  it('should refuse a grant from another environment', async () => {
    const other = new UserSession();
    await other.initialize();
    const topicGrant = await mint(other, 'sub-ada', { topic: 'ticket:1' });

    const res = await subscribe('ticket:1', { topicGrant });

    expect(res.status).to.equal(403);
    expect(res.body).to.include(INVALID_GRANT);
  });

  it('should refuse a login token sent as a grant', async () => {
    const topicGrant = await mint(session, 'sub-ada');

    const res = await subscribe('ticket:1', { topicGrant });

    expect(res.status).to.equal(403);
    expect(res.body).to.include(INVALID_GRANT);
  });

  it('should refuse an expired grant as expired, and an expired grant for another topic as invalid', async () => {
    const topicGrant = await mint(session, 'sub-ada', { topic: 'ticket:1', expiresIn: 1 });
    await new Promise((resolve) => setTimeout(resolve, 2100));

    const expired = await subscribe('ticket:1', { topicGrant });
    const otherTopic = await subscribe('ticket:2', { topicGrant });

    expect(expired.status).to.equal(403);
    expect(expired.body).to.include({ statusCode: 403, error: 'topic_grant_expired' });
    expect(otherTopic.status).to.equal(403);
    expect(otherTopic.body).to.include(INVALID_GRANT);
  });

  it('should refuse a grant sent as the subscriber token for an Inbox session', async () => {
    const subscriberToken = await mint(session, 'sub-ada', { topic: 'ticket:1' });

    const res = await session.testAgent.post('/v1/inbox/session').send({ subscriberToken });

    expect(res.status).to.equal(400);
    expect(res.body).to.include({ message: 'Please provide a valid HMAC hash' });
  });

  it('should subscribe and unsubscribe without a grant as before', async () => {
    const created = await subscribe('ticket:open', { identifier: 'open', topic: { name: 'Open ticket' } });

    expect(created.status, JSON.stringify(created.body)).to.equal(201);
    const topic = await topicRepository.findTopicByKey(
      'ticket:open',
      session.organization._id,
      session.environment._id
    );
    expect(topic?.name).to.equal('Open ticket');

    const deleted = await session.testAgent
      .delete('/v1/inbox/topics/ticket:open/subscriptions/open')
      .set('Authorization', `Bearer ${sessionToken}`);
    expect(deleted.status, JSON.stringify(deleted.body)).to.equal(200);
  });
});

async function mint(owner: UserSession, subscriberId: string, body: Record<string, unknown> = {}) {
  const res = await owner.testAgent
    .post(`/v2/subscribers/${subscriberId}/tokens`)
    .set('Authorization', `ApiKey ${owner.apiKey}`)
    .send(body);
  expect(res.status, JSON.stringify(res.body)).to.equal(201);

  return res.body.data.token as string;
}

async function inboxSession(owner: UserSession, subscriberId: string) {
  const subscriberToken = await mint(owner, subscriberId);
  const res = await owner.testAgent.post('/v1/inbox/session').send({ subscriberToken });
  expect(res.status, JSON.stringify(res.body)).to.equal(201);

  return res.body.data.token as string;
}

async function setHmac(owner: UserSession) {
  await integrationRepository.update(
    {
      _environmentId: owner.environment._id,
      _organizationId: owner.environment._organizationId,
      providerId: InAppProviderIdEnum.Novu,
      channel: ChannelTypeEnum.IN_APP,
      active: true,
    },
    { $set: { 'credentials.hmac': true, active: true } }
  );
}
