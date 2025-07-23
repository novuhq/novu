import { expect } from 'chai';
import { NotificationTemplateEntity, SubscriberEntity } from '@novu/dal';
import { StepTypeEnum, EmailBlockTypeEnum } from '@novu/shared';
import { SubscribersService, UserSession } from '@novu/testing';
import { Novu } from '@novu/api';
import { WorkflowRunRepository } from '@novu/application-generic';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';
import { sleep } from '../../events/e2e/utils/sleep.util';

describe('Workflow Runs Filtering & Pagination - GET /v1/activity/workflow-runs #novu-v2', function () {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;
  let novuClient: Novu;
  let workflowRunRepository: WorkflowRunRepository;

  // Helper function to create multiple workflow triggers with 5ms delay between each
  async function createMultipleWorkflowRuns(options: {
    count: number;
    workflowId: string;
    subscriberId: string;
    payloadTemplate?: (index: number) => Record<string, any>;
    transactionId?: string;
  }) {
    const { count, workflowId, subscriberId, payloadTemplate, transactionId } = options;

    for (let i = 1; i < count + 1; i += 1) {
      await novuClient.trigger({
        workflowId,
        to: [subscriberId],
        payload: payloadTemplate ? payloadTemplate(i) : { runNumber: i },
        ...(transactionId && { transactionId: `${transactionId}-${i}` }),
      });

      await sleep(5);
    }
  }

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber();
    novuClient = initNovuClassSdk(session);
    workflowRunRepository = session.testServer?.getService(WorkflowRunRepository);

    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.EMAIL,
          subject: 'Test subject',
          content: [{ type: EmailBlockTypeEnum.TEXT, content: 'Hello {{firstName}}' }],
        },
      ],
    });
  });

  it('should return paginated results with default limit', async () => {
    await createMultipleWorkflowRuns({
      count: 11,
      workflowId: template.triggers[0].identifier,
      subscriberId: subscriber.subscriberId,
    });

    await session.waitForWorkflowQueueCompletion();
    await session.waitForSubscriberQueueCompletion();

    const { body: firstPage } = await session.testAgent.get('/v1/activity/workflow-runs').expect(200);

    expect(firstPage.hasMore, 'firstPage hasMore').to.be.true;
    expect(firstPage.nextCursor, 'firstPage nextCursor').to.be.not.null;
    expect(firstPage.previousCursor, 'firstPage previousCursor').to.be.null;
    expect(firstPage.data.length, 'firstPage dataLength').to.be.equal(10);

    const { body: secondPage } = await session.testAgent
      .get('/v1/activity/workflow-runs')
      .query({ cursor: firstPage.nextCursor })
      .expect(200);

    expect(secondPage.hasMore, 'secondPage hasMore').to.be.false;
    expect(secondPage.nextCursor, 'secondPage nextCursor').to.be.null;
    expect(secondPage.previousCursor, 'secondPage previousCursor').to.be.not.null;
    expect(secondPage.data.length, 'secondPage dataLength').to.be.equal(1);
    expect(secondPage.data[0].payload.runNumber, 'secondPage runNumber').to.be.equal(1);
  });

  it('should respect custom limit parameter', async () => {
    await createMultipleWorkflowRuns({
      count: 5,
      workflowId: template.triggers[0].identifier,
      subscriberId: subscriber.subscriberId,
    });

    await session.waitForWorkflowQueueCompletion();
    await session.waitForSubscriberQueueCompletion();

    const { body } = await session.testAgent.get('/v1/activity/workflow-runs').query({ limit: 2 }).expect(200);

    expect(body.data.length).to.be.at.most(2);
  });

  it('should filter results by single workflowId', async () => {
    const secondTemplate = await session.createTemplate({
      steps: [{ type: StepTypeEnum.IN_APP, content: 'Test in-app message' }],
    });

    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: { firstName: 'John' },
    });

    await novuClient.trigger({
      workflowId: secondTemplate.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: { firstName: 'Jane' },
    });

    await session.waitForWorkflowQueueCompletion();
    await session.waitForSubscriberQueueCompletion();

    const { body } = await session.testAgent
      .get('/v1/activity/workflow-runs')
      .query({ workflowIds: [template._id] })
      .expect(200);

    expect(body.data).to.be.an('array');

    body.data.forEach((workflowRun: any) => {
      expect(workflowRun.workflowId).to.equal(template._id);
    });
  });

  it('should filter results by multiple workflowIds', async () => {
    const secondTemplate = await session.createTemplate({
      steps: [{ type: StepTypeEnum.IN_APP, content: 'Test in-app message' }],
    });

    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: { firstName: 'John' },
    });

    await novuClient.trigger({
      workflowId: secondTemplate.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: { firstName: 'Jane' },
    });

    await session.waitForWorkflowQueueCompletion();
    await session.waitForSubscriberQueueCompletion();

    const { body } = await session.testAgent
      .get('/v1/activity/workflow-runs')
      .query({ workflowIds: [template._id, secondTemplate._id] })
      .expect(200);

    expect(body.data).to.be.an('array');

    const allowedIds = [template._id, secondTemplate._id];
    body.data.forEach((workflowRun: any) => {
      expect(allowedIds).to.include(workflowRun.workflowId);
    });
  });

  it('should filter results by single subscriberId', async () => {
    const secondSubscriber = await subscriberService.createSubscriber();

    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: { firstName: 'John' },
    });

    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [secondSubscriber.subscriberId],
      payload: { firstName: 'Jane' },
    });

    await session.waitForWorkflowQueueCompletion();
    await session.waitForSubscriberQueueCompletion();

    const { body } = await session.testAgent
      .get('/v1/activity/workflow-runs')
      .query({ subscriberIds: [subscriber.subscriberId] })
      .expect(200);

    expect(body.data).to.be.an('array');

    body.data.forEach((workflowRun: any) => {
      expect(workflowRun.subscriberId).to.equal(subscriber.subscriberId);
    });
  });

  it('should filter results by transactionId', async () => {
    const customTransactionId = `test-transaction-${Date.now()}`;

    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: { firstName: 'John' },
      transactionId: customTransactionId,
    });

    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: { firstName: 'Jane' },
    });

    await session.waitForWorkflowQueueCompletion();
    await session.waitForSubscriberQueueCompletion();

    const { body } = await session.testAgent
      .get('/v1/activity/workflow-runs')
      .query({ transactionIds: [customTransactionId] })
      .expect(200);

    expect(body.data).to.be.an('array');

    body.data.forEach((workflowRun: any) => {
      expect(workflowRun.transactionId).to.equal(customTransactionId);
    });
  });

  it('should filter results by status', async () => {
    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: { firstName: 'John' },
    });

    await session.waitForWorkflowQueueCompletion();
    await session.waitForSubscriberQueueCompletion();

    const { body } = await session.testAgent
      .get('/v1/activity/workflow-runs')
      .query({ statuses: ['completed'] })
      .expect(200);

    expect(body.data).to.be.an('array');

    body.data.forEach((workflowRun: any) => {
      expect(workflowRun.status).to.equal('completed');
    });
  });

  it.only('should filter results by date range', async () => {
    await createMultipleWorkflowRuns({
      count: 2,
      workflowId: template.triggers[0].identifier,
      subscriberId: subscriber.subscriberId,
      payloadTemplate: (index) => ({ testText: `first trigger ${index}` }),
    });

    await session.waitForWorkflowQueueCompletion();
    await session.waitForSubscriberQueueCompletion();

    const beforeTrigger = new Date();

    await createMultipleWorkflowRuns({
      count: 2,
      workflowId: template.triggers[0].identifier,
      subscriberId: subscriber.subscriberId,
      payloadTemplate: (index) => ({ testText: `second trigger ${index}` }),
    });

    await session.waitForWorkflowQueueCompletion();
    await session.waitForSubscriberQueueCompletion();

    const afterTrigger = new Date();

    await createMultipleWorkflowRuns({
      count: 2,
      workflowId: template.triggers[0].identifier,
      subscriberId: subscriber.subscriberId,
      payloadTemplate: (index) => ({ testText: `third trigger ${index}` }),
    });

    await session.waitForWorkflowQueueCompletion();
    await session.waitForSubscriberQueueCompletion();

    const { body } = await session.testAgent
      .get('/v1/activity/workflow-runs')
      .query({
        /*
         * after: beforeTrigger.toISOString(),
         * before: afterTrigger.toISOString(),
         */

        createdGte: beforeTrigger.toISOString(),
        createdLte: afterTrigger.toISOString(),
      })
      .expect(200);

    expect(body.data).to.be.an('array');
    expect(body.data.length).to.be.greaterThan(0);
    body.data.forEach((workflowRun: any) => {
      expect(workflowRun.payload.testText).to.contain('second trigger');
    });
  });

  it('should support combining multiple filters', async () => {
    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: { firstName: 'John' },
    });

    await session.waitForWorkflowQueueCompletion();
    await session.waitForSubscriberQueueCompletion();

    const { body } = await session.testAgent
      .get('/v1/activity/workflow-runs')
      .query({
        workflowIds: [template._id],
        subscriberIds: [subscriber.subscriberId],
        statuses: ['completed'],
        limit: 10,
      })
      .expect(200);

    expect(body.data).to.be.an('array');

    body.data.forEach((workflowRun: any) => {
      expect(workflowRun.workflowId).to.equal(template._id);
      expect(workflowRun.subscriberId).to.equal(subscriber.subscriberId);
      expect(workflowRun.status).to.equal('completed');
    });
  });

  it('should handle empty results gracefully', async () => {
    const { body } = await session.testAgent
      .get('/v1/activity/workflow-runs')
      .query({ workflowIds: ['non-existent-id'] })
      .expect(200);

    expect(body.data).to.be.an('array');
    expect(body.data.length).to.equal(0);
    expect(body.hasMore).to.equal(false);
    expect(body.nextCursor).to.equal(null);
    expect(body.previousCursor).to.equal(null);
  });
});
