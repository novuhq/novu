import { ClickHouseService, WorkflowRunRepository, WorkflowRunStatusEnum } from '@novu/application-generic';
import { NotificationEntity, NotificationRepository, NotificationTemplateEntity, SubscriberEntity } from '@novu/dal';
import {
  ApiServiceLevelEnum,
  DeliveryLifecycleDetail,
  DeliveryLifecycleStatusEnum,
  EmailBlockTypeEnum,
  PermissionsEnum,
  StepTypeEnum,
} from '@novu/shared';
import { SubscribersService, UserSession } from '@novu/testing';
import { expect } from 'chai';
import { WorkflowRunStatsGroupByEnum } from '../dtos/shared.dto';
import { GetWorkflowRunStatsResponseDto } from '../dtos/workflow-run-stats.dto';

function unwrapStats(body: { data: GetWorkflowRunStatsResponseDto }): GetWorkflowRunStatsResponseDto {
  return body.data;
}

describe('Workflow Run Stats - GET /v1/activity/workflow-runs/stats #novu-v2', () => {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;
  let workflowRunRepository: WorkflowRunRepository;
  const clickHouseService = new ClickHouseService();

  async function createWorkflowRuns(options: {
    count: number;
    status?: WorkflowRunStatusEnum;
    channels?: StepTypeEnum[];
    deliveryLifecycleStatus?: DeliveryLifecycleStatusEnum;
    deliveryLifecycleDetail?: DeliveryLifecycleDetail;
    subscriberId?: string;
  }) {
    const {
      count,
      status = WorkflowRunStatusEnum.COMPLETED,
      channels = [StepTypeEnum.EMAIL],
      deliveryLifecycleStatus,
      deliveryLifecycleDetail,
      subscriberId = subscriber.subscriberId,
    } = options;

    const promises: Promise<void>[] = [];

    for (let i = 1; i < count + 1; i += 1) {
      const mockNotification: NotificationEntity = {
        _id: NotificationRepository.createObjectId(),
        _templateId: template._id,
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        _subscriberId: subscriber._id,
        topics: [],
        transactionId: `stats-txn_${Date.now()}_${i}_${Math.random()}`,
        channels,
        to: subscriberId,
        payload: { runNumber: i },
        controls: undefined,
        tags: [],
        createdAt: new Date().toISOString(),
      };

      promises.push(
        workflowRunRepository.create(mockNotification, template, {
          status,
          userId: session.user._id,
          externalSubscriberId: subscriberId,
          deliveryLifecycleStatus,
          deliveryLifecycleDetail,
        })
      );
    }

    await Promise.all(promises);
  }

  beforeEach(async () => {
    await clickHouseService.init();
    (process.env as any).IS_WORKFLOW_RUN_LOGS_WRITE_ENABLED = 'true';

    session = new UserSession();
    await session.initialize();
    subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber();
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

  afterEach(() => {
    delete (process.env as any).IS_WORKFLOW_RUN_LOGS_WRITE_ENABLED;
  });

  it('should return totals without groupBy', async () => {
    await createWorkflowRuns({ count: 3 });

    const { body } = await session.testAgent.get('/v1/activity/workflow-runs/stats').expect(200);
    const stats = unwrapStats(body);

    expect(stats.total).to.be.at.least(3);
    expect(stats.uniqueSubscribers).to.be.at.least(1);
    expect(stats.groupBy).to.equal(null);
    expect(stats.buckets).to.deep.equal([]);
  });

  it('should group by status and delivery lifecycle detail', async () => {
    await createWorkflowRuns({
      count: 2,
      status: WorkflowRunStatusEnum.ERROR,
      deliveryLifecycleStatus: DeliveryLifecycleStatusEnum.SKIPPED,
      deliveryLifecycleDetail: DeliveryLifecycleDetail.SUBSCRIBER_PREFERENCE,
    });
    await createWorkflowRuns({
      count: 1,
      status: WorkflowRunStatusEnum.COMPLETED,
      deliveryLifecycleStatus: DeliveryLifecycleStatusEnum.DELIVERED,
    });

    const { body: byStatusBody } = await session.testAgent
      .get('/v1/activity/workflow-runs/stats')
      .query({ groupBy: WorkflowRunStatsGroupByEnum.STATUS })
      .expect(200);
    const byStatus = unwrapStats(byStatusBody);

    expect(byStatus.groupBy).to.equal(WorkflowRunStatsGroupByEnum.STATUS);
    expect(byStatus.buckets.some((bucket) => bucket.key === 'error' && bucket.count >= 2)).to.equal(true);
    expect(byStatus.buckets.some((bucket) => bucket.key === 'completed' && bucket.count >= 1)).to.equal(true);

    const { body: byDetailBody } = await session.testAgent
      .get('/v1/activity/workflow-runs/stats')
      .query({
        groupBy: WorkflowRunStatsGroupByEnum.DELIVERY_LIFECYCLE_DETAIL,
        deliveryLifecycleStatus: [DeliveryLifecycleStatusEnum.SKIPPED],
      })
      .expect(200);
    const byDetail = unwrapStats(byDetailBody);

    expect(byDetail.total).to.be.at.least(2);
    expect(byDetail.buckets.some((bucket) => bucket.key === DeliveryLifecycleDetail.SUBSCRIBER_PREFERENCE)).to.equal(
      true
    );
  });

  it('should group by channel', async () => {
    await createWorkflowRuns({ count: 2, channels: [StepTypeEnum.EMAIL] });
    await createWorkflowRuns({ count: 1, channels: [StepTypeEnum.IN_APP] });

    const { body } = await session.testAgent
      .get('/v1/activity/workflow-runs/stats')
      .query({ groupBy: WorkflowRunStatsGroupByEnum.CHANNEL })
      .expect(200);
    const stats = unwrapStats(body);

    expect(stats.groupBy).to.equal(WorkflowRunStatsGroupByEnum.CHANNEL);
    expect(stats.buckets.some((bucket) => bucket.key === StepTypeEnum.EMAIL)).to.equal(true);
  });

  it('should return 402 when the requested window exceeds plan retention', async () => {
    const tooOld = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString();

    const { body } = await session.testAgent
      .get('/v1/activity/workflow-runs/stats')
      .query({ createdGte: tooOld })
      .expect(402);

    expect(body.message).to.include("plan's retention period");
  });

  it('should allow stats with an API key', async () => {
    const { body } = await session.testAgent
      .get('/v1/activity/workflow-runs/stats')
      .set('authorization', `ApiKey ${session.apiKey}`)
      .expect(200);

    expect(unwrapStats(body).total).to.be.a('number');
  });

  it('should deny stats without notification read permission', async () => {
    const originalRbac = process.env.IS_RBAC_ENABLED;
    (process.env as Record<string, string>).IS_RBAC_ENABLED = 'true';

    const deniedSession = new UserSession();
    await deniedSession.initialize();
    await deniedSession.updateOrganizationServiceLevel(ApiServiceLevelEnum.BUSINESS);
    await deniedSession.updateEETokenClaims({
      org_permissions: [PermissionsEnum.WORKFLOW_READ],
    });

    await deniedSession.testAgent.get('/v1/activity/workflow-runs/stats').expect(403);

    if (originalRbac === undefined) {
      delete (process.env as Record<string, string | undefined>).IS_RBAC_ENABLED;
    } else {
      process.env.IS_RBAC_ENABLED = originalRbac;
    }
  });

  it('should count a replaced workflow run once when querying with FINAL', async () => {
    const notificationId = NotificationRepository.createObjectId();
    const transactionId = `final-txn_${Date.now()}_${Math.random()}`;
    const mockNotification: NotificationEntity = {
      _id: notificationId,
      _templateId: template._id,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      _subscriberId: subscriber._id,
      topics: [],
      transactionId,
      channels: [StepTypeEnum.EMAIL],
      to: subscriber.subscriberId,
      payload: { runNumber: 1 },
      controls: undefined,
      tags: [],
      createdAt: new Date().toISOString(),
    };

    await workflowRunRepository.create(mockNotification, template, {
      status: WorkflowRunStatusEnum.PROCESSING,
      userId: session.user._id,
      externalSubscriberId: subscriber.subscriberId,
    });
    await workflowRunRepository.create(mockNotification, template, {
      status: WorkflowRunStatusEnum.COMPLETED,
      userId: session.user._id,
      externalSubscriberId: subscriber.subscriberId,
    });

    const { body } = await session.testAgent
      .get('/v1/activity/workflow-runs/stats')
      .query({ transactionIds: [transactionId] })
      .expect(200);
    const stats = unwrapStats(body);

    expect(stats.total).to.equal(1);
    expect(stats.uniqueSubscribers).to.equal(1);
  });

  it('should group by day, workflow, and delivery lifecycle status', async () => {
    await createWorkflowRuns({
      count: 2,
      deliveryLifecycleStatus: DeliveryLifecycleStatusEnum.DELIVERED,
    });

    const { body: byDayBody } = await session.testAgent
      .get('/v1/activity/workflow-runs/stats')
      .query({ groupBy: WorkflowRunStatsGroupByEnum.DAY })
      .expect(200);
    const byDay = unwrapStats(byDayBody);
    expect(byDay.groupBy).to.equal(WorkflowRunStatsGroupByEnum.DAY);
    expect(byDay.buckets.length).to.be.greaterThan(0);

    const { body: byWorkflowBody } = await session.testAgent
      .get('/v1/activity/workflow-runs/stats')
      .query({ groupBy: WorkflowRunStatsGroupByEnum.WORKFLOW })
      .expect(200);
    const byWorkflow = unwrapStats(byWorkflowBody);
    expect(byWorkflow.buckets.some((bucket) => bucket.key === template._id && bucket.count >= 2)).to.equal(true);

    const { body: byLifecycleBody } = await session.testAgent
      .get('/v1/activity/workflow-runs/stats')
      .query({ groupBy: WorkflowRunStatsGroupByEnum.DELIVERY_LIFECYCLE_STATUS })
      .expect(200);
    const byLifecycle = unwrapStats(byLifecycleBody);
    expect(
      byLifecycle.buckets.some((bucket) => bucket.key === DeliveryLifecycleStatusEnum.DELIVERED && bucket.count >= 2)
    ).to.equal(true);
  });
});
