import { NotFoundException } from '@nestjs/common';
import { StepRunV2ReadRow } from '@novu/application-generic';
import { NotificationRepository, NotificationWorkflowRunItem } from '@novu/dal';
import { DeliveryLifecycleStatusEnum, SeverityLevelEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { WorkflowRunStatusDtoEnum } from '../dtos/shared.dto';
import { GetWorkflowRunCommand } from '../usecases/get-workflow-run/get-workflow-run.command';
import { GetWorkflowRunsCommand } from '../usecases/get-workflow-runs/get-workflow-runs.command';
import { decodeWorkflowRunsCursor, encodeWorkflowRunsCursor } from './workflow-runs-v2.mappers';
import { WORKFLOW_RUNS_V2_MISSING_STEPS_METRIC, WorkflowRunsV2Reader } from './workflow-runs-v2-reader.service';

const ENVIRONMENT_ID = '6560d1d0e4b0a1b2c3d4e001';
const ORGANIZATION_ID = '6560d1d0e4b0a1b2c3d4e002';
const TEMPLATE_ID = '6560d1d0e4b0a1b2c3d4e003';
const SUBSCRIBER_ID = '6560d1d0e4b0a1b2c3d4e004';

function objectId(suffix: number): string {
  return `6560d1d0e4b0a1b2c3d4${suffix.toString(16).padStart(4, '0')}`;
}

function buildRun(index: number, overrides: Partial<NotificationWorkflowRunItem> = {}): NotificationWorkflowRunItem {
  return {
    _id: objectId(0x1000 + index),
    _templateId: TEMPLATE_ID,
    _environmentId: ENVIRONMENT_ID,
    _organizationId: ORGANIZATION_ID,
    _subscriberId: SUBSCRIBER_ID,
    transactionId: `txn_${index}`,
    to: { subscriberId: 'fallback-subscriber' },
    topics: [],
    channels: [],
    severity: SeverityLevelEnum.HIGH,
    critical: true,
    contextKeys: ['tenant:acme'],
    lastEmittedDeliveryEvent: 'workflow_run_delivery_delivered',
    lastEmittedWorkflowStatusEvent: 'workflow_run_status_completed',
    createdAt: new Date(Date.UTC(2026, 10, 5, 10, 0, 60 - index)).toISOString(),
    updatedAt: new Date(Date.UTC(2026, 10, 5, 10, 1, 0)).toISOString(),
    ...overrides,
  };
}

function buildStepRow(workflowRunId: string, overrides: Partial<StepRunV2ReadRow> = {}): StepRunV2ReadRow {
  return {
    workflow_run_id: workflowRunId,
    step_run_id: objectId(0x2000),
    step_id: 'step_1',
    step_identifier: 'in-app',
    step_name: 'In-App',
    step_type: 'in_app',
    status: 'completed',
    provider_id: 'novu',
    wait_amount: 0,
    wait_unit: '',
    wait_type: '',
    wait_until: '1970-01-01 00:00:00.000',
    digest_events_count: 0,
    schedule_extensions_count: 0,
    created_at: '2026-11-05 10:00:00.000',
    updated_at: '2026-11-05 10:00:01.000',
    ...overrides,
  };
}

describe('WorkflowRunsV2Reader', () => {
  describe('buildWorkflowRunsPageQuery filter mapping', () => {
    const repository = new NotificationRepository();
    const build = (filters: Parameters<NotificationRepository['buildWorkflowRunsPageQuery']>[0]['filters']) =>
      repository.buildWorkflowRunsPageQuery({ environmentId: ENVIRONMENT_ID, filters, direction: 'DESC' });

    it('always scopes to the environment', () => {
      expect(build({})).to.deep.equal({ _environmentId: ENVIRONMENT_ID });
    });

    it('maps workflow, subscriber, transaction and channel filters', () => {
      const query = build({
        templates: [TEMPLATE_ID],
        subscriberIds: [SUBSCRIBER_ID],
        transactionId: ['txn_1'],
        channels: ['email' as never],
      });

      expect(query._templateId).to.deep.equal({ $in: [TEMPLATE_ID] });
      expect(query._subscriberId).to.deep.equal({ $in: [SUBSCRIBER_ID] });
      expect(query.transactionId).to.deep.equal({ $in: ['txn_1'] });
      expect(query.channels).to.deep.equal({ $in: ['email'] });
    });

    it('maps topic key and subscription to exact topic matches', () => {
      const query = build({ topicKey: 'team-a', subscriptionId: 'sub_1' });

      expect(query['topics.topicKey']).to.equal('team-a');
      expect(query['topics.preferenceEvaluation.subscriptionIdentifier']).to.equal('sub_1');
    });

    it('maps severity, including none matching runs without severity', () => {
      expect(build({ severity: [SeverityLevelEnum.HIGH] }).severity).to.deep.equal({ $in: [SeverityLevelEnum.HIGH] });
      expect(build({ severity: [SeverityLevelEnum.NONE] }).$and).to.deep.equal([
        { $or: [{ severity: { $exists: false } }, { severity: { $in: [SeverityLevelEnum.NONE] } }] },
      ]);
    });

    it('maps context keys to an exact match, and an empty list to runs without context', () => {
      expect(build({ contextKeys: ['tenant:b', 'tenant:a'] }).$and).to.deep.equal([
        { contextKeys: { $all: ['tenant:a', 'tenant:b'], $size: 2 } },
      ]);
      expect(build({ contextKeys: [] }).$and).to.deep.equal([
        { $or: [{ contextKeys: { $exists: false } }, { contextKeys: [] }] },
      ]);
    });

    it('maps the created range', () => {
      expect(build({ after: '2026-11-01T00:00:00.000Z', before: '2026-11-05T00:00:00.000Z' }).createdAt).to.deep.equal({
        $gte: '2026-11-01T00:00:00.000Z',
        $lte: '2026-11-05T00:00:00.000Z',
      });
    });

    it('maps statuses to the last emitted workflow status event', () => {
      expect(build({ statuses: ['processing', 'completed', 'error'] }).$and).to.deep.equal([
        {
          lastEmittedWorkflowStatusEvent: {
            $in: [null, 'workflow_run_status_completed', 'workflow_run_status_error'],
          },
        },
      ]);
    });

    it('adds the (createdAt, _id) keyset condition in both directions', () => {
      const cursor = { createdAt: '2026-11-05T10:00:00.000Z', id: objectId(1) };
      const cursorDate = new Date(cursor.createdAt);

      const descQuery = repository.buildWorkflowRunsPageQuery({
        environmentId: ENVIRONMENT_ID,
        filters: {},
        cursor,
        direction: 'DESC',
      });
      const ascQuery = repository.buildWorkflowRunsPageQuery({
        environmentId: ENVIRONMENT_ID,
        filters: {},
        cursor,
        direction: 'ASC',
      });

      expect(descQuery.$and).to.deep.equal([
        { $or: [{ createdAt: { $lt: cursorDate } }, { createdAt: cursorDate, _id: { $lt: cursor.id } }] },
      ]);
      expect(ascQuery.$and).to.deep.equal([
        { $or: [{ createdAt: { $gt: cursorDate } }, { createdAt: cursorDate, _id: { $gt: cursor.id } }] },
      ]);
    });
  });

  describe('reader', () => {
    let notificationRepository: { findWorkflowRunsPage: sinon.SinonStub; findOne: sinon.SinonStub };
    let notificationTemplateRepository: { find: sinon.SinonStub };
    let subscriberRepository: { find: sinon.SinonStub; searchSubscribers: sinon.SinonStub };
    let stepRunV2Repository: { findByWorkflowRunIds: sinon.SinonStub };
    let traceLogRepository: { find: sinon.SinonStub };
    let activityRetentionService: { resolve: sinon.SinonStub };
    let metricsService: { recordMetric: sinon.SinonStub };
    let reader: WorkflowRunsV2Reader;

    const listCommand = (overrides: Partial<GetWorkflowRunsCommand> = {}) =>
      ({
        environmentId: ENVIRONMENT_ID,
        organizationId: ORGANIZATION_ID,
        userId: 'user_1',
        limit: 2,
        ...overrides,
      }) as GetWorkflowRunsCommand;

    const detailCommand = (workflowRunId: string) =>
      ({
        environmentId: ENVIRONMENT_ID,
        organizationId: ORGANIZATION_ID,
        userId: 'user_1',
        workflowRunId,
      }) as GetWorkflowRunCommand;

    beforeEach(() => {
      notificationRepository = { findWorkflowRunsPage: sinon.stub().resolves([]), findOne: sinon.stub() };
      notificationTemplateRepository = {
        find: sinon
          .stub()
          .resolves([{ _id: TEMPLATE_ID, name: 'Welcome', triggers: [{ identifier: 'welcome-flow' }] }]),
      };
      subscriberRepository = {
        find: sinon.stub().resolves([{ _id: SUBSCRIBER_ID, subscriberId: 'external-1' }]),
        searchSubscribers: sinon.stub().resolves([SUBSCRIBER_ID]),
      };
      stepRunV2Repository = { findByWorkflowRunIds: sinon.stub().resolves([]) };
      traceLogRepository = { find: sinon.stub().resolves({ data: [] }) };
      activityRetentionService = {
        resolve: sinon.stub().resolves({ after: '2026-10-01T00:00:00.000Z', before: '2026-11-06T00:00:00.000Z' }),
      };
      metricsService = { recordMetric: sinon.stub() };

      reader = new WorkflowRunsV2Reader(
        notificationRepository as never,
        notificationTemplateRepository as never,
        subscriberRepository as never,
        stepRunV2Repository as never,
        traceLogRepository as never,
        activityRetentionService as never,
        { setContext: sinon.stub(), warn: sinon.stub(), error: sinon.stub() } as never,
        metricsService as never
      );
    });

    afterEach(() => {
      sinon.restore();
    });

    it('maps request filters onto the notifications page query', async () => {
      await reader.list(
        listCommand({
          workflowIds: [TEMPLATE_ID, 'not-an-object-id'],
          subscriberIds: ['external-1'],
          transactionIds: ['txn_1'],
          channels: ['email'],
          topicKey: 'team-a',
          subscriptionId: 'sub_1',
          severity: [SeverityLevelEnum.HIGH],
          contextKeys: ['tenant:acme'],
          statuses: [WorkflowRunStatusDtoEnum.ERROR],
        })
      );

      expect(subscriberRepository.searchSubscribers.calledOnceWithExactly(ENVIRONMENT_ID, ['external-1'])).to.equal(
        true
      );
      const params = notificationRepository.findWorkflowRunsPage.firstCall.args[0];
      expect(params).to.deep.include({ environmentId: ENVIRONMENT_ID, limit: 3, direction: 'DESC', cursor: undefined });
      expect(params.filters).to.deep.equal({
        templates: [TEMPLATE_ID],
        subscriberIds: [SUBSCRIBER_ID],
        transactionId: ['txn_1'],
        channels: ['email'],
        topicKey: 'team-a',
        subscriptionId: 'sub_1',
        severity: [SeverityLevelEnum.HIGH],
        contextKeys: ['tenant:acme'],
        after: '2026-10-01T00:00:00.000Z',
        before: '2026-11-06T00:00:00.000Z',
        statuses: ['error'],
      });
    });

    it('returns an empty page without querying when no subscriber matches', async () => {
      subscriberRepository.searchSubscribers.resolves([]);

      const result = await reader.list(listCommand({ subscriberIds: ['unknown'] }));

      expect(result).to.deep.equal({ data: [], next: null, previous: null });
      expect(notificationRepository.findWorkflowRunsPage.called).to.equal(false);
    });

    it('returns an empty page when no workflow id is a valid id', async () => {
      const result = await reader.list(listCommand({ workflowIds: ['not-an-object-id'] }));

      expect(result).to.deep.equal({ data: [], next: null, previous: null });
      expect(notificationRepository.findWorkflowRunsPage.called).to.equal(false);
    });

    it('maps runs and their step_runs_v2 rows', async () => {
      const runs = [buildRun(1), buildRun(2, { lastEmittedWorkflowStatusEvent: undefined })];
      notificationRepository.findWorkflowRunsPage.resolves(runs);
      stepRunV2Repository.findByWorkflowRunIds.resolves([
        buildStepRow(runs[0]._id, {
          step_run_id: objectId(0x2002),
          created_at: '2026-11-05 10:00:01.000',
          provider_id: '',
        }),
        buildStepRow(runs[0]._id, { step_run_id: objectId(0x2001), step_type: 'trigger', provider_id: '' }),
      ]);

      const result = await reader.list(listCommand());

      expect(stepRunV2Repository.findByWorkflowRunIds.firstCall.args[0]).to.deep.equal({
        environmentId: ENVIRONMENT_ID,
        workflowRunIds: runs.map((run) => run._id),
        oldestRunCreatedAt: new Date(runs[1].createdAt as string),
        limit: 1000,
      });
      expect(result.next).to.equal(null);
      expect(result.previous).to.equal(null);
      expect(result.data[0]).to.deep.equal({
        id: runs[0]._id,
        workflowId: TEMPLATE_ID,
        workflowName: 'Welcome',
        organizationId: ORGANIZATION_ID,
        environmentId: ENVIRONMENT_ID,
        internalSubscriberId: SUBSCRIBER_ID,
        subscriberId: 'external-1',
        status: WorkflowRunStatusDtoEnum.COMPLETED,
        deliveryLifecycleStatus: DeliveryLifecycleStatusEnum.DELIVERED,
        triggerIdentifier: 'welcome-flow',
        transactionId: 'txn_1',
        createdAt: runs[0].createdAt,
        updatedAt: runs[0].updatedAt,
        severity: SeverityLevelEnum.HIGH,
        critical: true,
        contextKeys: ['tenant:acme'],
        topics: [],
        digestedWorkflowRunId: undefined,
        steps: [
          {
            id: objectId(0x2001),
            stepRunId: objectId(0x2001),
            stepId: 'step_1',
            stepType: 'trigger',
            providerId: undefined,
            status: 'completed',
          },
          {
            id: objectId(0x2002),
            stepRunId: objectId(0x2002),
            stepId: 'step_1',
            stepType: 'in_app',
            providerId: undefined,
            status: 'completed',
          },
        ],
      });
      expect(result.data[1].status).to.equal(WorkflowRunStatusDtoEnum.PROCESSING);
      expect(result.data[1].steps).to.deep.equal([]);
      expect(metricsService.recordMetric.calledOnceWithExactly(WORKFLOW_RUNS_V2_MISSING_STEPS_METRIC, 1)).to.equal(
        true
      );
    });

    it('links a merged run to the run whose digest it was merged into', async () => {
      const masterRunId = objectId(0x1999);
      notificationRepository.findWorkflowRunsPage.resolves([buildRun(1, { _digestedNotificationId: masterRunId })]);

      const [run] = (await reader.list(listCommand())).data;

      expect(run.digestedWorkflowRunId).to.equal(masterRunId);
    });

    it('falls back to the trigger target and empty workflow fields when lookups miss', async () => {
      notificationRepository.findWorkflowRunsPage.resolves([buildRun(1)]);
      notificationTemplateRepository.find.resolves([]);
      subscriberRepository.find.resolves([]);

      const [run] = (await reader.list(listCommand())).data;

      expect(run.subscriberId).to.equal('fallback-subscriber');
      expect(run.workflowName).to.equal('');
      expect(run.triggerIdentifier).to.equal('');
    });

    it('returns steps: [] when the step_runs_v2 query fails', async () => {
      notificationRepository.findWorkflowRunsPage.resolves([buildRun(1)]);
      stepRunV2Repository.findByWorkflowRunIds.rejects(new Error('ClickHouse down'));

      const [run] = (await reader.list(listCommand())).data;

      expect(run.steps).to.deep.equal([]);
    });

    it('returns a next cursor from the last run when there are more runs', async () => {
      const runs = [buildRun(1), buildRun(2), buildRun(3)];
      notificationRepository.findWorkflowRunsPage.resolves(runs);

      const result = await reader.list(listCommand());

      expect(result.data.map((run) => run.id)).to.deep.equal([runs[0]._id, runs[1]._id]);
      expect(decodeWorkflowRunsCursor(result.next as string)).to.deep.equal({
        created_at: runs[1].createdAt,
        workflow_run_id: runs[1]._id,
      });
    });

    it('builds the previous cursor from the runs newer than the current cursor', async () => {
      const cursor = { created_at: buildRun(5).createdAt as string, workflow_run_id: buildRun(5)._id };
      notificationRepository.findWorkflowRunsPage.onFirstCall().resolves([buildRun(6)]);
      notificationRepository.findWorkflowRunsPage.onSecondCall().resolves([buildRun(4), buildRun(3)]);

      const result = await reader.list(listCommand({ cursor: encodeWorkflowRunsCursor(cursor) }));

      const pageParams = notificationRepository.findWorkflowRunsPage.firstCall.args[0];
      const previousParams = notificationRepository.findWorkflowRunsPage.secondCall.args[0];
      expect(pageParams.cursor).to.deep.equal({ createdAt: cursor.created_at, id: cursor.workflow_run_id });
      expect(previousParams).to.deep.include({ direction: 'ASC', limit: 2 });
      expect(decodeWorkflowRunsCursor(result.previous as string)).to.deep.equal({
        created_at: buildRun(3).createdAt,
        workflow_run_id: buildRun(3)._id,
      });
    });

    it('points the previous cursor at the first page when fewer runs than a page are newer', async () => {
      const cursor = { created_at: buildRun(5).createdAt as string, workflow_run_id: buildRun(5)._id };
      notificationRepository.findWorkflowRunsPage.onFirstCall().resolves([buildRun(6)]);
      notificationRepository.findWorkflowRunsPage.onSecondCall().resolves([buildRun(4)]);

      const result = await reader.list(listCommand({ cursor: encodeWorkflowRunsCursor(cursor) }));

      expect(decodeWorkflowRunsCursor(result.previous as string)).to.deep.equal({
        created_at: new Date(0).toISOString(),
        workflow_run_id: '1',
      });
    });

    it('treats the first page cursor as no cursor', async () => {
      notificationRepository.findWorkflowRunsPage.resolves([buildRun(1)]);

      const result = await reader.list(
        listCommand({
          cursor: encodeWorkflowRunsCursor({ created_at: new Date(0).toISOString(), workflow_run_id: '1' }),
        })
      );

      expect(notificationRepository.findWorkflowRunsPage.calledOnce).to.equal(true);
      expect(notificationRepository.findWorkflowRunsPage.firstCall.args[0].cursor).to.equal(undefined);
      expect(result.previous).to.equal(null);
    });

    it('returns the detail with payload, overrides, digest events and execution details', async () => {
      const run = buildRun(1);
      const digestStepRunId = objectId(0x2003);
      notificationRepository.findOne.resolves({ ...run, payload: { foo: 'bar' }, overrides: { email: { to: 'x' } } });
      stepRunV2Repository.findByWorkflowRunIds.resolves([
        buildStepRow(run._id, {
          step_run_id: digestStepRunId,
          step_type: 'digest',
          wait_type: 'regular',
          wait_amount: 2,
          wait_unit: 'seconds',
          wait_until: '2026-11-05 10:00:02.000',
          digest_events_count: 2,
          schedule_extensions_count: 1,
        }),
      ]);
      const digestEvents = [{ _id: 'job_1' }, { _id: 'job_2' }];
      traceLogRepository.find.onFirstCall().resolves({
        data: [
          {
            entity_id: digestStepRunId,
            id: 'trace_1',
            status: 'success',
            title: 'Digest triggered events',
            raw_data: JSON.stringify(digestEvents),
            created_at: '2026-11-05 10:00:02.000',
            event_type: 'digest_triggered',
          },
        ],
      });
      traceLogRepository.find.onSecondCall().resolves({
        data: [
          { entity_id: digestStepRunId, raw_data: JSON.stringify(digestEvents), created_at: '2026-11-05 10:00:02.000' },
        ],
      });

      const result = await reader.get(detailCommand(run._id));

      expect(result.payload).to.deep.equal({ foo: 'bar' });
      expect(result.overrides).to.deep.equal({ email: { to: 'x' } });
      expect(result.workflowName).to.equal('Welcome');
      expect(result.steps).to.have.length(1);
      expect(result.steps[0]).to.deep.include({
        stepRunId: digestStepRunId,
        stepType: 'digest',
        scheduleExtensionsCount: 1,
        digest: { type: 'regular', amount: 2, unit: 'seconds', events: digestEvents },
      });
      expect(result.steps[0].createdAt.toISOString()).to.equal('2026-11-05T10:00:00.000Z');
      expect(result.steps[0].executionDetails).to.have.length(1);
      expect(result.steps[0].executionDetails[0]).to.deep.include({
        _id: 'trace_1',
        detail: 'Digest triggered events',
      });

      const digestTraceWhere = JSON.stringify(traceLogRepository.find.secondCall.args[0].where);
      expect(digestTraceWhere).to.contain('digest_triggered');
      expect(digestTraceWhere).to.contain(digestStepRunId);
    });

    it('does not query digest traces when the run has no digest step', async () => {
      const run = buildRun(1);
      notificationRepository.findOne.resolves(run);
      stepRunV2Repository.findByWorkflowRunIds.resolves([buildStepRow(run._id)]);

      await reader.get(detailCommand(run._id));

      expect(traceLogRepository.find.calledOnce).to.equal(true);
    });

    it('throws not found for an unknown or invalid workflow run id', async () => {
      notificationRepository.findOne.resolves(null);

      for (const workflowRunId of [objectId(0x9999), 'not-an-object-id']) {
        let error: unknown;
        try {
          await reader.get(detailCommand(workflowRunId));
        } catch (caught) {
          error = caught;
        }
        expect(error).to.be.instanceOf(NotFoundException);
      }
      expect(notificationRepository.findOne.calledOnce).to.equal(true);
    });
  });
});
