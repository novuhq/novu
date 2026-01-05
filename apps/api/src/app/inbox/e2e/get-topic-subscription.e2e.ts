import { PreferencesRepository } from '@novu/dal';
import { PreferencesTypeEnum, StepTypeEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { CreateTopicSubscriptionRequestDto } from '../dtos/create-topic-subscription-request.dto';

describe('Get topic subscription - /inbox/topics/:topicKey/subscriptions/:identifier (GET) #novu-v2', () => {
  let session: UserSession;
  const preferencesRepository = new PreferencesRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should return subscription by identifier with stored preferences when present', async () => {
    const topicKey = `topic-${Date.now()}`;
    const subscriptionIdentifier = `subscription-${Date.now()}`;

    const workflow = await session.createTemplate({
      noFeedId: true,
      steps: [{ type: StepTypeEnum.IN_APP, content: 'Test content' }],
    });
    const workflowIdentifier = workflow.triggers[0].identifier;

    const createResponse = await createSubscription({
      session,
      topicKey,
      body: {
        identifier: subscriptionIdentifier,
        preferences: [workflowIdentifier],
      },
    });
    expect(createResponse.status).to.equal(201);

    const response = await getSubscription(session, topicKey, subscriptionIdentifier);
    expect(response.status).to.equal(200);
    expect(response.body.data.identifier).to.equal(subscriptionIdentifier);
    expect(response.body.data.preferences).to.have.lengthOf(1);
    expect(response.body.data.preferences[0].workflow.identifier).to.equal(workflowIdentifier);
  });

  it('should return 204 when subscription does not exist', async () => {
    const topicKey = `topic-${Date.now()}`;
    const response = await getSubscription(session, topicKey, `non-existent-${Date.now()}`);
    expect(response.status).to.equal(204);
  });

  describe('workflowIds and tags query parameter', () => {
    it('should compute preferences for requested workflows, avoiding duplicates with stored preferences', async () => {
      const topicKey = `topic-${Date.now()}`;
      const subscriptionIdentifier = `subscription-${Date.now()}`;

      const storedWorkflow = await session.createTemplate({
        noFeedId: true,
        steps: [{ type: StepTypeEnum.IN_APP, content: 'Stored' }],
      });
      const requestedWorkflow = await session.createTemplate({
        noFeedId: true,
        steps: [{ type: StepTypeEnum.EMAIL, content: 'Requested' }],
      });

      const storedId = storedWorkflow.triggers[0].identifier;
      const requestedId = requestedWorkflow.triggers[0].identifier;

      await createSubscription({
        session,
        topicKey,
        body: { identifier: subscriptionIdentifier, preferences: [storedId] },
      });

      const withNewWorkflow = await getSubscription(session, topicKey, subscriptionIdentifier, {
        workflowIds: [requestedId],
      });
      expect(withNewWorkflow.body.data.preferences).to.have.lengthOf(2);
      const ids = extractWorkflowIdentifiers(withNewWorkflow.body.data.preferences);
      expect(ids).to.include(storedId);
      expect(ids).to.include(requestedId);

      const withStoredWorkflow = await getSubscription(session, topicKey, subscriptionIdentifier, {
        workflowIds: [storedId],
      });
      expect(withStoredWorkflow.body.data.preferences).to.have.lengthOf(1);
      expect(withStoredWorkflow.body.data.preferences[0].workflow.identifier).to.equal(storedId);

      const withoutNewWorkflow = await getSubscription(session, topicKey, subscriptionIdentifier);
      expect(withoutNewWorkflow.body.data.preferences).to.have.lengthOf(1);
      expect(withoutNewWorkflow.body.data.preferences[0].workflow.identifier).to.equal(storedId);

      const withBoth = await getSubscription(session, topicKey, subscriptionIdentifier, {
        workflowIds: [storedId, requestedId],
      });
      expect(withBoth.body.data.preferences).to.have.lengthOf(2);
    });

    it('should handle single string and array query params for workflowIds and tags', async () => {
      const topicKey = `topic-${Date.now()}`;
      const subscriptionIdentifier = `subscription-${Date.now()}`;
      const tag = `tag-${Date.now()}`;

      const workflow1 = await session.createTemplate({
        noFeedId: true,
        steps: [{ type: StepTypeEnum.IN_APP, content: 'W1' }],
      });
      const workflow2 = await session.createTemplate({
        noFeedId: true,
        steps: [{ type: StepTypeEnum.EMAIL, content: 'W2' }],
      });
      await session.createTemplate({
        noFeedId: true,
        tags: [tag],
        steps: [{ type: StepTypeEnum.SMS, content: 'Tagged' }],
      });

      await createSubscription({ session, topicKey, body: { identifier: subscriptionIdentifier } });

      const singleWorkflowParam = await getSubscription(session, topicKey, subscriptionIdentifier, {
        workflowIds: [workflow1.triggers[0].identifier],
      });
      expect(singleWorkflowParam.body.data.preferences).to.have.lengthOf(1);

      const arrayWorkflowParam = await getSubscription(session, topicKey, subscriptionIdentifier, {
        workflowIds: [workflow1.triggers[0].identifier, workflow2.triggers[0].identifier],
      });
      expect(arrayWorkflowParam.body.data.preferences).to.have.lengthOf(2);

      const singleTagParam = await getSubscription(session, topicKey, subscriptionIdentifier, {
        tags: [tag],
      });
      expect(singleTagParam.body.data.preferences).to.have.lengthOf(1);
      expect(singleTagParam.body.data.preferences[0].workflow.tags).to.include(tag);
    });

    it('should compute preferences for workflows matching tags', async () => {
      const topicKey = `topic-${Date.now()}`;
      const subscriptionIdentifier = `subscription-${Date.now()}`;
      const tag1 = `tag1-${Date.now()}`;
      const tag2 = `tag2-${Date.now()}`;

      const workflow1 = await session.createTemplate({
        noFeedId: true,
        tags: [tag1],
        steps: [{ type: StepTypeEnum.IN_APP, content: 'W1' }],
      });
      const workflow2 = await session.createTemplate({
        noFeedId: true,
        tags: [tag1],
        steps: [{ type: StepTypeEnum.EMAIL, content: 'W2' }],
      });
      const workflow3 = await session.createTemplate({
        noFeedId: true,
        tags: [tag2],
        steps: [{ type: StepTypeEnum.SMS, content: 'W3' }],
      });
      await session.createTemplate({
        noFeedId: true,
        steps: [{ type: StepTypeEnum.PUSH, content: 'Untagged' }],
      });

      await createSubscription({ session, topicKey, body: { identifier: subscriptionIdentifier } });

      const singleTag = await getSubscription(session, topicKey, subscriptionIdentifier, { tags: [tag1] });
      expect(singleTag.body.data.preferences).to.have.lengthOf(2);
      const tag1Ids = extractWorkflowIdentifiers(singleTag.body.data.preferences);
      expect(tag1Ids).to.include(workflow1.triggers[0].identifier);
      expect(tag1Ids).to.include(workflow2.triggers[0].identifier);

      const multipleTags = await getSubscription(session, topicKey, subscriptionIdentifier, { tags: [tag1, tag2] });
      expect(multipleTags.body.data.preferences).to.have.lengthOf(3);
      const allIds = extractWorkflowIdentifiers(multipleTags.body.data.preferences);
      expect(allIds).to.include(workflow3.triggers[0].identifier);
    });

    it('should merge stored, identifier-based, and tag-based preferences without duplicates', async () => {
      const topicKey = `topic-${Date.now()}`;
      const subscriptionIdentifier = `subscription-${Date.now()}`;
      const testTag = `tag-${Date.now()}`;

      const storedWorkflow = await session.createTemplate({
        noFeedId: true,
        steps: [{ type: StepTypeEnum.IN_APP, content: 'Stored' }],
      });
      const identifierWorkflow = await session.createTemplate({
        noFeedId: true,
        steps: [{ type: StepTypeEnum.EMAIL, content: 'By ID' }],
      });
      const taggedWorkflow = await session.createTemplate({
        noFeedId: true,
        tags: [testTag],
        steps: [{ type: StepTypeEnum.SMS, content: 'By Tag' }],
      });
      const dualMatchWorkflow = await session.createTemplate({
        noFeedId: true,
        tags: [testTag],
        steps: [{ type: StepTypeEnum.PUSH, content: 'Dual Match' }],
      });

      await createSubscription({
        session,
        topicKey,
        body: { identifier: subscriptionIdentifier, preferences: [storedWorkflow.triggers[0].identifier] },
      });

      const response = await getSubscription(session, topicKey, subscriptionIdentifier, {
        workflowIds: [identifierWorkflow.triggers[0].identifier, dualMatchWorkflow.triggers[0].identifier],
        tags: [testTag],
      });

      expect(response.body.data.preferences).to.have.lengthOf(4);

      const ids = extractWorkflowIdentifiers(response.body.data.preferences);
      expect(ids).to.include(storedWorkflow.triggers[0].identifier);
      expect(ids).to.include(identifierWorkflow.triggers[0].identifier);
      expect(ids).to.include(taggedWorkflow.triggers[0].identifier);
      expect(ids).to.include(dualMatchWorkflow.triggers[0].identifier);

      expect(ids).to.have.lengthOf(4);
    });

    it('should return enabled=true and full workflow metadata for computed preferences', async () => {
      const topicKey = `topic-${Date.now()}`;
      const subscriptionIdentifier = `subscription-${Date.now()}`;
      const workflowName = `Test Workflow ${Date.now()}`;
      const testTag = `tag-${Date.now()}`;

      const workflow = await session.createTemplate({
        name: workflowName,
        noFeedId: true,
        tags: [testTag],
        steps: [{ type: StepTypeEnum.IN_APP, content: 'Test' }],
      });

      await createSubscription({ session, topicKey, body: { identifier: subscriptionIdentifier } });

      const response = await getSubscription(session, topicKey, subscriptionIdentifier, {
        workflowIds: [workflow.triggers[0].identifier],
      });

      const pref = response.body.data.preferences[0];
      expect(pref.enabled).to.equal(true);
      expect(pref.workflow.id).to.equal(workflow._id);
      expect(pref.workflow.identifier).to.equal(workflow.triggers[0].identifier);
      expect(pref.workflow.name).to.equal(workflowName);
      expect(pref.workflow.tags).to.include(testTag);
    });

    it('should return enabled=false for computed preferences when USER_WORKFLOW preference is disabled', async () => {
      const topicKey = `topic-${Date.now()}`;
      const subscriptionIdentifier = `subscription-${Date.now()}`;

      const workflow = await session.createTemplate({
        noFeedId: true,
        steps: [{ type: StepTypeEnum.IN_APP, content: 'Test' }],
      });

      await preferencesRepository.update(
        {
          _environmentId: session.environment._id,
          _organizationId: session.organization._id,
          _templateId: workflow._id,
          type: PreferencesTypeEnum.USER_WORKFLOW,
        },
        {
          $set: { 'preferences.all.enabled': false },
        }
      );

      await createSubscription({ session, topicKey, body: { identifier: subscriptionIdentifier } });

      const response = await getSubscription(session, topicKey, subscriptionIdentifier, {
        workflowIds: [workflow.triggers[0].identifier],
      });

      const pref = response.body.data.preferences[0];
      expect(pref.enabled).to.equal(false);
    });
  });
});

function extractWorkflowIdentifiers(preferences: Array<{ workflow: { identifier: string } }>): string[] {
  return preferences.map((p) => p.workflow.identifier);
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

async function getSubscription(
  session: UserSession,
  topicKey: string,
  identifier: string,
  queryParams?: { workflowIds?: string[]; tags?: string[] }
) {
  const searchParams = new URLSearchParams();

  if (queryParams?.workflowIds?.length) {
    for (const id of queryParams.workflowIds) {
      searchParams.append('workflowIds', id);
    }
  }

  if (queryParams?.tags?.length) {
    for (const tag of queryParams.tags) {
      searchParams.append('tags', tag);
    }
  }

  const query = searchParams.toString() ? `?${searchParams.toString()}` : '';

  return await session.testAgent
    .get(`/v1/inbox/topics/${topicKey}/subscriptions/${identifier}${query}`)
    .set('Authorization', `Bearer ${session.subscriberToken}`);
}
