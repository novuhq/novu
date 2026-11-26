import { Novu } from '@novu/api';
import { WorkflowRunRepository, WorkflowRunStatusEnum } from '@novu/application-generic';
import { NotificationRepository, NotificationTemplateEntity, SubscriberEntity } from '@novu/dal';
import { ApiServiceLevelEnum, EmailBlockTypeEnum, StepTypeEnum } from '@novu/shared';
import { SubscribersService, UserSession } from '@novu/testing';
import { expect } from 'chai';
import { subDays } from 'date-fns';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Workflow Run - GET /v1/activity/workflow-runs/:workflowRunId #novu-v2', () => {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;
  let novuClient: Novu;
  let workflowRunRepository: WorkflowRunRepository;

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
        {
          type: StepTypeEnum.IN_APP,
          content: 'In-app notification for {{firstName}}',
        },
      ],
    });
  });

  it('should return workflow run details by ID', async () => {
    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId, '123'],
      payload: { firstName: 'John' },
    });

    await session.waitForWorkflowQueueCompletion();
    await session.waitForSubscriberQueueCompletion();

    const workflowRun = await workflowRunRepository.findOne({
      where: {
        enforced: { environmentId: session.environment._id },
        conditions: [
          { field: 'organization_id', operator: '=', value: session.organization._id },
          { field: 'subscriber_id', operator: '=', value: subscriber._id },
        ],
      },
      select: '*',
    });

    const workflowRunId = workflowRun?.data?.workflow_run_id;

    const { body } = await session.testAgent.get(`/v1/activity/workflow-runs/${workflowRunId}`).expect(200);
    const { data } = body;

    expect(data.id, 'response workflow run id').to.equal(workflowRunId);
    expect(data.subscriberId, 'response subscriber id').to.equal(subscriber.subscriberId);
    expect(data.organizationId, 'response organization id').to.equal(session.organization._id);
    expect(data.environmentId, 'response environment id').to.equal(session.environment._id);
    expect(data.steps.length, 'response steps count').to.be.greaterThan(0);

    const triggerSteps = data.steps.filter((step: any) => step.stepType === 'trigger');
    expect(triggerSteps.length, 'should have exactly one trigger step').to.equal(1);

    const triggerStepRunTraces = data.steps[0].executionDetails;
    expect(triggerStepRunTraces.length, 'response step execution details count').to.be.greaterThan(0);
    expect(triggerStepRunTraces[0].detail, 'response step execution details status').to.equal('Step created');
  });

  it('should return 404 for non-existent workflow run', async () => {
    const nonExistentId = 'non-existent-workflow-run-id';

    await session.testAgent.get(`/v1/activity/workflow-runs/${nonExistentId}`).expect(404);
  });

  it("should reject a workflow run older than the plan's retention window", async () => {
    const originalWriteEnabled = process.env.IS_WORKFLOW_RUN_LOGS_WRITE_ENABLED;
    (process.env as any).IS_WORKFLOW_RUN_LOGS_WRITE_ENABLED = 'true';

    try {
      const workflowRunId = NotificationRepository.createObjectId();
      await workflowRunRepository.create(
        {
          _id: workflowRunId,
          _templateId: template._id,
          _environmentId: session.environment._id,
          _organizationId: session.organization._id,
          _subscriberId: subscriber._id,
          topics: [],
          transactionId: `txn_${workflowRunId}`,
          channels: [StepTypeEnum.EMAIL],
          to: subscriber.subscriberId,
          payload: {},
          controls: undefined,
          tags: [],
          createdAt: subDays(new Date(), 3).toISOString(),
        },
        template,
        {
          status: WorkflowRunStatusEnum.COMPLETED,
          userId: session.user._id,
          externalSubscriberId: subscriber.subscriberId,
        }
      );

      const { body } = await session.testAgent.get(`/v1/activity/workflow-runs/${workflowRunId}`).expect(402);

      expect(body.message).to.contain("older than your plan's retention period");

      await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.BUSINESS);

      const { body: businessBody } = await session.testAgent
        .get(`/v1/activity/workflow-runs/${workflowRunId}`)
        .expect(200);

      expect(businessBody.data.id).to.equal(workflowRunId);
    } finally {
      if (originalWriteEnabled === undefined) {
        delete (process.env as any).IS_WORKFLOW_RUN_LOGS_WRITE_ENABLED;
      } else {
        (process.env as any).IS_WORKFLOW_RUN_LOGS_WRITE_ENABLED = originalWriteEnabled;
      }
    }
  });
});
