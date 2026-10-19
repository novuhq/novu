import { SubscriberRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { CreateTopicSubscriptionRequestDto } from '../dtos/create-topic-subscription-request.dto';

describe('Topic subscription ownership boundary - /inbox/topics/:topicKey/subscriptions/:identifier (GET, PATCH, DELETE) #novu-v2', () => {
  let session: UserSession;
  let attackerToken: string;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    const attackerSubscriberId = SubscriberRepository.createObjectId();
    const attackerInit = await session.testAgent
      .post('/v1/widgets/session/initialize')
      .send({
        applicationIdentifier: session.environment.identifier,
        subscriberId: attackerSubscriberId,
        firstName: 'Attacker',
        lastName: 'User',
        email: 'attacker@example.com',
      })
      .expect(201);
    attackerToken = attackerInit.body.data.token;
  });

  it('should let the owning subscriber read and update its own topic subscription', async () => {
    const topicKey = `topic-${Date.now()}`;
    const subscriptionIdentifier = `subscription-${Date.now()}`;

    const createResponse = await createSubscriptionAs(session.subscriberToken, session, topicKey, {
      identifier: subscriptionIdentifier,
      name: 'Owner Original',
    });
    expect(createResponse.status).to.equal(201);

    const getResponse = await getSubscriptionAs(session.subscriberToken, session, topicKey, subscriptionIdentifier);
    expect(getResponse.status).to.equal(200);
    expect(getResponse.body.data.identifier).to.equal(subscriptionIdentifier);
    expect(getResponse.body.data.name).to.equal('Owner Original');

    const patchResponse = await patchSubscriptionAs(
      session.subscriberToken,
      session,
      topicKey,
      subscriptionIdentifier,
      { name: 'Owner Renamed' }
    );
    expect(patchResponse.status).to.equal(200);
    expect(patchResponse.body.data.name).to.equal('Owner Renamed');

    const verifyResponse = await getSubscriptionAs(session.subscriberToken, session, topicKey, subscriptionIdentifier);
    expect(verifyResponse.status).to.equal(200);
    expect(verifyResponse.body.data.name).to.equal('Owner Renamed');
  });

  it('should not let another subscriber read or mutate the victim subscription via GET, PATCH, or DELETE', async () => {
    const topicKey = `topic-${Date.now()}`;
    const subscriptionIdentifier = `subscription-${Date.now()}`;
    const ownerName = 'Owner Original Name';

    const createResponse = await createSubscriptionAs(session.subscriberToken, session, topicKey, {
      identifier: subscriptionIdentifier,
      name: ownerName,
    });
    expect(createResponse.status).to.equal(201);

    const attackerGetResponse = await getSubscriptionAs(attackerToken, session, topicKey, subscriptionIdentifier);
    expect(attackerGetResponse.status, 'attacker GET should be denied as if subscription does not exist').to.equal(204);
    expect(attackerGetResponse.body).to.deep.equal({});

    const attackerPatchResponse = await patchSubscriptionAs(attackerToken, session, topicKey, subscriptionIdentifier, {
      name: 'Attacker Renamed',
    });
    expect(attackerPatchResponse.status, 'attacker PATCH should be denied').to.be.oneOf([403, 404]);

    const attackerDeleteResponse = await deleteSubscriptionAs(attackerToken, session, topicKey, subscriptionIdentifier);
    expect(attackerDeleteResponse.status, 'attacker DELETE should be denied').to.be.oneOf([403, 404]);

    const ownerVerifyResponse = await getSubscriptionAs(
      session.subscriberToken,
      session,
      topicKey,
      subscriptionIdentifier
    );
    expect(ownerVerifyResponse.status).to.equal(200);
    expect(ownerVerifyResponse.body.data.name, 'victim subscription must not have been mutated by attacker').to.equal(
      ownerName
    );
  });
});

async function createSubscriptionAs(
  token: string,
  session: UserSession,
  topicKey: string,
  body: CreateTopicSubscriptionRequestDto
) {
  return await session.testAgent
    .post(`/v1/inbox/topics/${topicKey}/subscriptions`)
    .send(body)
    .set('Authorization', `Bearer ${token}`);
}

async function getSubscriptionAs(token: string, session: UserSession, topicKey: string, identifier: string) {
  return await session.testAgent
    .get(`/v1/inbox/topics/${topicKey}/subscriptions/${identifier}`)
    .set('Authorization', `Bearer ${token}`);
}

async function patchSubscriptionAs(
  token: string,
  session: UserSession,
  topicKey: string,
  identifier: string,
  body: { name?: string }
) {
  return await session.testAgent
    .patch(`/v1/inbox/topics/${topicKey}/subscriptions/${identifier}`)
    .send(body)
    .set('Authorization', `Bearer ${token}`);
}

async function deleteSubscriptionAs(token: string, session: UserSession, topicKey: string, identifier: string) {
  return await session.testAgent
    .delete(`/v1/inbox/topics/${topicKey}/subscriptions/${identifier}`)
    .set('Authorization', `Bearer ${token}`);
}
