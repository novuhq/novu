import { StepRunV2ReadRow } from '@novu/application-generic';
import { NotificationFeedItemEntity } from '@novu/dal';
import { DigestTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import {
  NOTIFICATION_FEED_V2_MISSING_STEPS_METRIC,
  NotificationFeedV2Reader,
} from './notification-feed-v2-reader.service';

const ENVIRONMENT_ID = '6560d1d0e4b0a1b2c3d4e001';
const ORGANIZATION_ID = '6560d1d0e4b0a1b2c3d4e002';
const TEMPLATE_ID = '6560d1d0e4b0a1b2c3d4e003';
const NOTIFICATION_ID = '6560d1d0e4b0a1b2c3d4e004';
const scope = { environmentId: ENVIRONMENT_ID, organizationId: ORGANIZATION_ID };

function buildNotification(overrides: Partial<NotificationFeedItemEntity> = {}): NotificationFeedItemEntity {
  return {
    _id: NOTIFICATION_ID,
    _templateId: TEMPLATE_ID,
    _environmentId: ENVIRONMENT_ID,
    _organizationId: ORGANIZATION_ID,
    _subscriberId: 'subscriber-1',
    transactionId: 'txn-1',
    payload: { foo: 'bar' },
    overrides: { email: { subject: 'Hi' } },
    createdAt: '2026-11-05T10:00:00.000Z',
    jobs: [],
    ...overrides,
  } as NotificationFeedItemEntity;
}

function buildStepRow(overrides: Partial<StepRunV2ReadRow> = {}): StepRunV2ReadRow {
  return {
    workflow_run_id: NOTIFICATION_ID,
    step_run_id: 'job-1',
    step_id: 'step-1',
    step_identifier: 'in-app',
    step_name: 'In-App',
    step_type: 'in_app',
    status: 'completed',
    provider_id: 'novu',
    wait_amount: 0,
    wait_unit: '',
    wait_type: '',
    wait_until: '1970-01-01 00:00:00.000',
    digest_metadata: '',
    digest_events_count: 0,
    schedule_extensions_count: 0,
    created_at: '2026-11-05 10:00:00.000',
    updated_at: '2026-11-05 10:00:01.000',
    ...overrides,
  };
}

describe('NotificationFeedV2Reader', () => {
  let notificationRepository: { getFeedWithoutJobs: sinon.SinonStub; findNotificationMetadataOnly: sinon.SinonStub };
  let stepRunV2Repository: { findByWorkflowRunIds: sinon.SinonStub };
  let traceLogRepository: { find: sinon.SinonStub };
  let metricsService: { recordMetric: sinon.SinonStub };
  let reader: NotificationFeedV2Reader;

  beforeEach(() => {
    notificationRepository = {
      getFeedWithoutJobs: sinon.stub().resolves([]),
      findNotificationMetadataOnly: sinon.stub().resolves(null),
    };
    stepRunV2Repository = { findByWorkflowRunIds: sinon.stub().resolves([]) };
    traceLogRepository = { find: sinon.stub().resolves({ data: [] }) };
    metricsService = { recordMetric: sinon.stub() };

    reader = new NotificationFeedV2Reader(
      notificationRepository as never,
      stepRunV2Repository as never,
      traceLogRepository as never,
      metricsService as never,
      { setContext: sinon.stub(), warn: sinon.stub(), error: sinon.stub() } as never
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  it('reads the feed page without jobs and attaches steps from step_runs_v2, skipping the trigger step', async () => {
    const filters = { channels: null, templates: [TEMPLATE_ID], subscriberIds: [] };
    notificationRepository.getFeedWithoutJobs.resolves([buildNotification()]);
    stepRunV2Repository.findByWorkflowRunIds.resolves([
      buildStepRow({ step_run_id: 'job-0', step_id: 'trigger-step', step_type: 'trigger' }),
      buildStepRow(),
    ]);

    const [feedItem] = await reader.getFeed({ ...scope, filters, skip: 20, limit: 10 });

    expect(notificationRepository.getFeedWithoutJobs.calledOnceWithExactly(ENVIRONMENT_ID, filters, 20, 10)).to.equal(
      true
    );
    expect(stepRunV2Repository.findByWorkflowRunIds.firstCall.args[0]).to.deep.include({
      environmentId: ENVIRONMENT_ID,
      workflowRunIds: [NOTIFICATION_ID],
      limit: 1000,
      offset: 0,
    });
    expect(stepRunV2Repository.findByWorkflowRunIds.calledOnce).to.equal(true);
    expect(feedItem.jobs.map((job) => job._id)).to.deep.equal(['job-1']);
    expect(feedItem.jobs[0]).to.deep.include({
      status: 'completed',
      step: {
        _id: 'step-1',
        _templateId: '',
        stepId: 'in-app',
        name: 'In-App',
        active: true,
        filters: [],
        template: { type: 'in_app' },
      },
    });
    expect(metricsService.recordMetric.called).to.equal(false);
  });

  it('attaches digest settings, digest events and execution details for the detail', async () => {
    notificationRepository.findNotificationMetadataOnly.resolves(buildNotification());
    stepRunV2Repository.findByWorkflowRunIds.resolves([
      buildStepRow({
        step_type: 'digest',
        digest_metadata: JSON.stringify({ type: DigestTypeEnum.REGULAR, amount: 2, unit: 'seconds' }),
      }),
    ]);
    const events = [{ _id: 'event-1' }];
    traceLogRepository.find.onFirstCall().resolves({
      data: [
        {
          entity_id: 'job-1',
          id: 'trace-1',
          status: 'success',
          title: 'Digest triggered events',
          raw_data: JSON.stringify(events),
          created_at: '2026-11-05 10:00:02.000',
        },
      ],
    });
    traceLogRepository.find.onSecondCall().resolves({
      data: [{ entity_id: 'job-1', raw_data: JSON.stringify(events), created_at: '2026-11-05 10:00:02.000' }],
    });

    const feedItem = await reader.getFeedItem({ ...scope, notificationId: NOTIFICATION_ID });

    expect(feedItem?.jobs[0].digest).to.deep.equal({
      type: DigestTypeEnum.REGULAR,
      amount: 2,
      unit: 'seconds',
      events,
    });
    expect(feedItem?.jobs[0].executionDetails.map((detail) => detail._id)).to.deep.equal(['trace-1']);
    expect(JSON.stringify(traceLogRepository.find.secondCall.args[0].where)).to.contain('digest_triggered');
  });

  it('does not query traces when the run has no step runs, and records the gap', async () => {
    notificationRepository.findNotificationMetadataOnly.resolves(buildNotification());

    const feedItem = await reader.getFeedItem({ ...scope, notificationId: NOTIFICATION_ID });

    expect(feedItem?.jobs).to.deep.equal([]);
    expect(traceLogRepository.find.called).to.equal(false);
    expect(metricsService.recordMetric.calledOnceWithExactly(NOTIFICATION_FEED_V2_MISSING_STEPS_METRIC, 1)).to.equal(
      true
    );
  });

  it('returns empty jobs instead of failing when ClickHouse is unavailable', async () => {
    notificationRepository.findNotificationMetadataOnly.resolves(buildNotification());
    stepRunV2Repository.findByWorkflowRunIds.rejects(new Error('ClickHouse down'));

    const feedItem = await reader.getFeedItem({ ...scope, notificationId: NOTIFICATION_ID });

    expect(feedItem?.jobs).to.deep.equal([]);
  });

  it('returns null for an unknown or invalid notification id without a lookup for the invalid one', async () => {
    expect(await reader.getFeedItem({ ...scope, notificationId: 'not-an-object-id' })).to.equal(null);
    expect(notificationRepository.findNotificationMetadataOnly.called).to.equal(false);

    expect(await reader.getFeedItem({ ...scope, notificationId: NOTIFICATION_ID })).to.equal(null);
  });

  it('pages through step rows until a read returns less than a full page', async () => {
    const fullPage = Array.from({ length: 1000 }, (_, index) =>
      buildStepRow({ step_run_id: `job-${String(index).padStart(4, '0')}` })
    );
    notificationRepository.findNotificationMetadataOnly.resolves(buildNotification());
    stepRunV2Repository.findByWorkflowRunIds.onFirstCall().resolves(fullPage);
    stepRunV2Repository.findByWorkflowRunIds
      .onSecondCall()
      .resolves([buildStepRow({ step_run_id: 'job-0999' }), buildStepRow({ step_run_id: 'job-1000' })]);

    const feedItem = await reader.getFeedItem({ ...scope, notificationId: NOTIFICATION_ID });

    expect(stepRunV2Repository.findByWorkflowRunIds.secondCall.args[0].offset).to.equal(1000);
    expect(feedItem?.jobs).to.have.length(1001);
  });

  it('splits trace reads so every step run fits within one read', async () => {
    notificationRepository.findNotificationMetadataOnly.resolves(buildNotification());
    stepRunV2Repository.findByWorkflowRunIds.resolves(
      Array.from({ length: 45 }, (_, index) => buildStepRow({ step_run_id: `job-${index}` }))
    );

    await reader.getFeedItem({ ...scope, notificationId: NOTIFICATION_ID });

    expect(traceLogRepository.find.callCount).to.equal(3);
    for (const call of traceLogRepository.find.getCalls()) {
      expect(call.args[0].limit).to.equal(1000);
    }
  });

  it('never reads step_runs_v2 for an empty page', async () => {
    const result = await reader.getFeed({ ...scope, filters: {}, skip: 0, limit: 10 });

    expect(result).to.deep.equal([]);
    expect(stepRunV2Repository.findByWorkflowRunIds.called).to.equal(false);
  });
});
