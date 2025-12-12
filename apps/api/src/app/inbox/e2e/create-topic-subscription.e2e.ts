import { StepTypeEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { CreateTopicSubscriptionRequestDto } from '../dtos/create-topic-subscription-request.dto';

describe('Create topic subscription - /inbox/topics/:topicKey/subscriptions (POST) #novu-v2', () => {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should accept preferences as an array of workflow identifier strings', async () => {
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

    const workflowIdentifier = workflow.triggers[0].identifier;

    const subscriptionResponse = await createSubscription({
      session,
      topicKey,
      body: {
        identifier: subscriptionIdentifier,
        preferences: [workflowIdentifier],
      },
    });

    expect(subscriptionResponse.status, 'Should have created the subscription with string preferences').to.equal(201);
    expect(subscriptionResponse.body.data.preferences).to.exist;
    expect(subscriptionResponse.body.data.preferences.length).to.equal(1);
  });

  it('should accept preferences as mixed array of strings and objects', async () => {
    const topicKey = `topic-${Date.now()}`;
    const subscriptionIdentifier = `subscription-${Date.now()}`;

    const workflow1 = await session.createTemplate({
      noFeedId: true,
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Test content 1',
        },
      ],
    });

    const workflow2 = await session.createTemplate({
      noFeedId: true,
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Test content 2',
        },
      ],
    });

    const workflow1Identifier = workflow1.triggers[0].identifier;

    const subscriptionResponse = await createSubscription({
      session,
      topicKey,
      body: {
        identifier: subscriptionIdentifier,
        preferences: [workflow1Identifier, { workflowId: workflow2._id, enabled: true }],
      },
    });

    expect(subscriptionResponse.status, 'Should have created the subscription with mixed preferences').to.equal(201);
    expect(subscriptionResponse.body.data.preferences).to.exist;
    expect(subscriptionResponse.body.data.preferences.length).to.equal(2);
  });

  it('should accept preferences as group filter objects', async () => {
    const topicKey = `topic-${Date.now()}`;
    const subscriptionIdentifier = `subscription-${Date.now()}`;

    const workflow = await session.createTemplate({
      noFeedId: true,
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Test content',
        },
      ],
    });

    const subscriptionResponse = await createSubscription({
      session,
      topicKey,
      body: {
        identifier: subscriptionIdentifier,
        preferences: [
          {
            filter: {
              workflowIds: [workflow._id],
            },
            enabled: true,
          },
        ],
      },
    });

    expect(subscriptionResponse.status, 'Should have created the subscription with group filter preferences').to.equal(
      201
    );
    expect(subscriptionResponse.body.data.preferences).to.exist;
    expect(subscriptionResponse.body.data.preferences.length).to.equal(1);
  });
});

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
