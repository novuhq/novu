import { expect } from 'chai';
import { NotificationTemplateEntity, SubscriberEntity, NotificationRepository } from '@novu/dal';
import { StepTypeEnum, EmailBlockTypeEnum } from '@novu/shared';
import { SubscribersService, UserSession } from '@novu/testing';
import { Novu } from '@novu/api';
import { WorkflowRunRepository } from '@novu/application-generic';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe.only('Workflow Run - GET /v1/activity/workflow-run/:workflowRunId #novu-v2', () => {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;
  let novuClient: Novu;
  let notificationId: string;
  const notificationRepository = new NotificationRepository();
  let workflowRunRepository: WorkflowRunRepository;

  let originalIsWorkflowRunLogsWriteEnabled: string | undefined;

  before(async () => {
    originalIsWorkflowRunLogsWriteEnabled = process.env.IS_WORKFLOW_RUN_LOGS_WRITE_ENABLED;
    (process.env as any).IS_WORKFLOW_RUN_LOGS_WRITE_ENABLED = 'true';
  });

  after(async () => {
    if (originalIsWorkflowRunLogsWriteEnabled === undefined) {
      delete (process.env as any).IS_WORKFLOW_RUN_LOGS_WRITE_ENABLED;
    } else {
      (process.env as any).IS_WORKFLOW_RUN_LOGS_WRITE_ENABLED = originalIsWorkflowRunLogsWriteEnabled;
    }
  });

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
      to: [subscriber.subscriberId],
      payload: { firstName: 'John' },
    });

    await session.waitForWorkflowQueueCompletion();
    await session.waitForSubscriberQueueCompletion();

    const workflowRun = await workflowRunRepository.findOne({
      where: {
        environment_id: session.environment._id,
        organization_id: session.organization._id,
        subscriber_id: subscriber._id,
      },
    });

    const workflowRunId = workflowRun?.data?.id;

    const { body } = await session.testAgent.get(`/v1/activity/workflow-runs/${workflowRunId}`).expect(200);
    const { data } = body;

    expect(data.id, 'response workflow run id').to.equal(workflowRunId);
    expect(data.subscriberId, 'response subscriber id').to.equal(subscriber._id);
    expect(data.organizationId, 'response organization id').to.equal(session.organization._id);
    expect(data.environmentId, 'response environment id').to.equal(session.environment._id);
    expect(data.steps.length, 'response steps count').to.be.greaterThan(0);

    const triggerStepRun = data.steps[0];
    expect(triggerStepRun.stepType, 'response step type').to.equal('trigger');

    const triggerStepRunTraces = data.steps[0].executionDetails;
    expect(triggerStepRunTraces.length, 'response step execution details count').to.be.greaterThan(0);
    expect(triggerStepRunTraces[0].detail, 'response step execution details status').to.equal('Step queued');
  });

  it('should return 404 for non-existent workflow run', async () => {
    const nonExistentId = 'non-existent-workflow-run-id';

    await session.testAgent.get(`/v1/activity/workflow-runs/${nonExistentId}`).expect(404);
  });
});
