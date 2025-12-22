import { PreferenceLevelEnum, StepTypeEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { SubscriptionResponseDto } from '../../shared/dtos/subscriptions/create-subscriptions-response.dto';
import { CreateTopicSubscriptionRequestDto } from '../dtos/create-topic-subscription-request.dto';
import { UpdatePreferencesRequestDto } from '../dtos/update-preferences-request.dto';

describe('Update subscription workflow preferences - /inbox/subscriptions/:subscriptionId/preferences/:workflowIdOrIdentifier (PATCH) #novu-v2', () => {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should update subscription workflow preferences', async () => {
    const topicKey = `topic-${Date.now()}`;
    const subscriptionIdentifier = `subscription-${Date.now()}`;
    const workflow = await session.createTemplate({
      noFeedId: true,
      steps: [
        {
          type: StepTypeEnum.EMAIL,
          content: 'Test email content',
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Test notification content',
        },
      ],
    });

    const subscriptionResponse = await createSubscription({
      session,
      topicKey,
      body: {
        identifier: subscriptionIdentifier,
        preferences: [{ workflowId: workflow._id, condition: true }],
      },
    });
    expect(subscriptionResponse.status, 'Should have created the subscription').to.equal(201);

    const topicSubscriptions = await getTopicSubscriptions(session, topicKey);
    const topicSubscription: SubscriptionResponseDto = topicSubscriptions.body.data[0];
    expect(topicSubscription.preferences?.[0]?.enabled, 'Should have enabled the preference').to.equal(true);
    expect(topicSubscription.preferences?.[0]?.condition, 'Should have condition the preference').to.equal(true);

    const subscriptionId = subscriptionResponse.body.data.id;

    // Update using Subscription ID
    let response = await updateSubscriptionPreferences(session, subscriptionId, workflow._id, { enabled: false });

    expect(response.status, 'Should have updated the subscription preference using ID').to.equal(200);
    expect(response.body.data.level, 'Should have the correct level').to.equal(PreferenceLevelEnum.TEMPLATE);
    expect(response.body.data.workflow.id, 'Should have the correct workflow ID').to.equal(workflow._id);
    expect(response.body.data.enabled, 'Should have the correct enabled value').to.equal(false);

    // Update using Subscription Identifier
    response = await updateSubscriptionPreferences(session, subscriptionIdentifier, workflow._id, { enabled: true });

    expect(response.status, 'Should have updated the subscription preference using Identifier').to.equal(200);
    expect(response.body.data.enabled, 'Should have the correct enabled value').to.equal(true);

    // Handle multiple updates (toggle back)
    response = await updateSubscriptionPreferences(session, subscriptionId, workflow._id, { enabled: false });

    expect(response.status, 'Should have updated the subscription preference again').to.equal(200);
    expect(response.body.data.enabled, 'Should have the correct enabled value').to.equal(false);
  });

  it('should update all channel preferences when enabled is toggled', async () => {
    const topicKey = `topic-${Date.now()}`;
    const subscriptionIdentifier = `subscription-${Date.now()}`;
    const workflow = await session.createTemplate({
      noFeedId: true,
      steps: [
        {
          type: StepTypeEnum.EMAIL,
          content: 'Test email content',
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Test notification content',
        },
        {
          type: StepTypeEnum.SMS,
          content: 'Test SMS content',
        },
      ],
    });

    const subscriptionResponse = await createSubscription({
      session,
      topicKey,
      body: {
        identifier: subscriptionIdentifier,
      },
    });
    expect(subscriptionResponse.status).to.equal(201);
    const subscriptionId = subscriptionResponse.body.data.id;

    const response = await updateSubscriptionPreferences(session, subscriptionId, workflow._id, {
      enabled: false,
      email: false,
      sms: false,
      in_app: false,
      chat: false,
      push: false,
    });

    expect(response.status).to.equal(200);
    expect(response.body.data.enabled, 'Should have updated enabled value').to.equal(false);
    expect(response.body.data.channels.email, 'Should have updated email channel').to.equal(false);
    expect(response.body.data.channels.sms, 'Should have updated sms channel').to.equal(false);
    expect(response.body.data.channels.in_app, 'Should have updated in_app channel').to.equal(false);

    const responseEnabled = await updateSubscriptionPreferences(session, subscriptionId, workflow._id, {
      enabled: true,
      email: true,
      sms: true,
      in_app: true,
      chat: true,
      push: true,
    });

    expect(responseEnabled.status).to.equal(200);
    expect(responseEnabled.body.data.enabled, 'Should have updated enabled value').to.equal(true);
    expect(responseEnabled.body.data.channels.email, 'Should have updated email channel').to.equal(true);
    expect(responseEnabled.body.data.channels.sms, 'Should have updated sms channel').to.equal(true);
    expect(responseEnabled.body.data.channels.in_app, 'Should have updated in_app channel').to.equal(true);
  });

  it('should allow different preferences for the same workflow across different subscriptions', async () => {
    const topicKey1 = `topic-${Date.now()}-1`;
    const topicKey2 = `topic-${Date.now()}-2`;
    const workflow = await session.createTemplate({
      noFeedId: true,
      steps: [
        {
          type: StepTypeEnum.EMAIL,
          content: 'Test email content',
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Test notification content',
        },
      ],
    });

    const subscription1Response = await createSubscription({
      session,
      topicKey: topicKey1,
      body: {
        identifier: `subscription-${Date.now()}-1`,
      },
    });
    expect(subscription1Response.status).to.equal(201);
    const subscription1Id = subscription1Response.body.data.id;

    const subscription2Response = await createSubscription({
      session,
      topicKey: topicKey2,
      body: {
        identifier: `subscription-${Date.now()}-2`,
      },
    });
    expect(subscription2Response.status).to.equal(201);
    const subscription2Id = subscription2Response.body.data.id;

    const update1 = await updateSubscriptionPreferences(session, subscription1Id, workflow._id, { enabled: true });

    expect(update1.status).to.equal(200);
    expect(update1.body.data.enabled).to.equal(true);

    const update2 = await updateSubscriptionPreferences(session, subscription2Id, workflow._id, { enabled: false });

    expect(update2.status).to.equal(200);
    expect(update2.body.data.enabled).to.equal(false);
  });
});

async function updateSubscriptionPreferences(
  session: UserSession,
  subscriptionId: string,
  workflowId: string,
  body: UpdatePreferencesRequestDto
) {
  return await session.testAgent
    .patch(`/v1/inbox/subscriptions/${subscriptionId}/preferences/${workflowId}`)
    .send(body)
    .set('Authorization', `Bearer ${session.subscriberToken}`);
}

async function getTopicSubscriptions(session: UserSession, topicKey: string) {
  return await session.testAgent
    .get(`/v1/inbox/topics/${topicKey}/subscriptions`)
    .set('Authorization', `Bearer ${session.subscriberToken}`);
}

async function createSubscription({
  session,
  topicKey,
  body,
}: {
  session: UserSession;
  topicKey: string;
  body: CreateTopicSubscriptionRequestDto;
}) {
  return await session.testAgent
    .post(`/v1/inbox/topics/${topicKey}/subscriptions`)
    .send(body)
    .set('Authorization', `Bearer ${session.subscriberToken}`);
}
