import { JobTopicNameEnum, QueueBackend } from '@novu/shared';

import { restoreQueueBackendEnv } from '../../config/queue-backend.test-helpers';
import { BullMqService } from '../bull-mq';
import { DeferReasonEnum, EventBridgeSchedulerService } from '../scheduler';
import { SqsPartialSendError, SqsService } from '../sqs';
import { SQS_MAX_DELAY_SECONDS } from '../sqs/types';
import { QueueBaseService } from './queue-base.service';

const ORGANIZATION_ID = '65f1a2b3c4d5e6f708192a3b';
const JOB_ID = '65f1a2b3c4d5e6f708192a3c';
const LONG_DELAY_MS = (SQS_MAX_DELAY_SECONDS + 1) * 1000;
const SHORT_DELAY_MS = 60_000;

type Harness = {
  service: QueueBaseService;
  bullMq: { add: jest.Mock; addBulk: jest.Mock; createQueue: jest.Mock };
  sqs: { isConfigured: jest.Mock; send: jest.Mock; sendBulk: jest.Mock };
  scheduler: { isConfigured: jest.Mock; createDelayedFire: jest.Mock; deleteSchedule: jest.Mock };
};

/**
 * Builds a service with mocked backends, and sets `QUEUE_BACKEND` for the rest
 * of the test - the predicates read it on every call, so one harness per test.
 */
function buildHarnessOnBackend(
  options: { sqsConfigured?: boolean; schedulerConfigured?: boolean; backend?: QueueBackend } = {}
): Harness {
  const { sqsConfigured = true, schedulerConfigured = true, backend = QueueBackend.SQS_BULLMQ } = options;

  process.env.QUEUE_BACKEND = backend;

  const bullMq = { add: jest.fn(), addBulk: jest.fn(), createQueue: jest.fn() };
  const sqs = { isConfigured: jest.fn(() => sqsConfigured), send: jest.fn(), sendBulk: jest.fn() };
  const scheduler = {
    isConfigured: jest.fn(() => schedulerConfigured),
    createDelayedFire: jest.fn(),
    deleteSchedule: jest.fn(),
  };

  /*
   * The backends hold private state, so the stubs can never be one of them.
   * `Partial<T>` still checks each stubbed method against the real signature.
   */
  const bullMqStub: Partial<BullMqService> = bullMq;
  const sqsStub: Partial<SqsService> = sqs;
  const schedulerStub: Partial<EventBridgeSchedulerService> = scheduler;

  const service = new QueueBaseService(
    JobTopicNameEnum.STANDARD,
    bullMqStub as BullMqService,
    sqsStub as SqsService,
    undefined,
    schedulerStub as EventBridgeSchedulerService
  );

  return { service, bullMq, sqs, scheduler };
}

function longDelayJob(overrides: Record<string, unknown> = {}) {
  return {
    name: JOB_ID,
    data: { _id: JOB_ID, _organizationId: ORGANIZATION_ID },
    groupId: ORGANIZATION_ID,
    options: { delay: LONG_DELAY_MS, jobId: JOB_ID },
    deferReason: DeferReasonEnum.DIGEST,
    ...overrides,
  };
}

describe('QueueBaseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(restoreQueueBackendEnv());

  describe('backend selection', () => {
    it('should enqueue to BullMQ in bullmq mode even when SQS is configured', async () => {
      const { service, bullMq, sqs, scheduler } = buildHarnessOnBackend({ backend: QueueBackend.BULLMQ });

      await service.add(longDelayJob({ options: { delay: SHORT_DELAY_MS, jobId: JOB_ID } }));

      expect(bullMq.add).toHaveBeenCalledTimes(1);
      expect(sqs.send).not.toHaveBeenCalled();
      expect(scheduler.createDelayedFire).not.toHaveBeenCalled();
    });

    it('should enqueue to BullMQ when the topic has no SQS queue url', async () => {
      const { service, bullMq, sqs } = buildHarnessOnBackend({ sqsConfigured: false });

      await service.add(longDelayJob({ options: { delay: SHORT_DELAY_MS, jobId: JOB_ID } }));

      expect(bullMq.add).toHaveBeenCalledTimes(1);
      expect(sqs.send).not.toHaveBeenCalled();
    });

    it('should refuse to enqueue in sqs mode when the topic has no SQS queue url', async () => {
      const { service, bullMq } = buildHarnessOnBackend({ sqsConfigured: false, backend: QueueBackend.SQS });

      await expect(service.add(longDelayJob())).rejects.toThrow(/no backend/);
      expect(bullMq.add).not.toHaveBeenCalled();
    });

    it('should not create a BullMQ queue in sqs mode', () => {
      const { service, bullMq } = buildHarnessOnBackend({ backend: QueueBackend.SQS });

      service.createQueue();

      expect(bullMq.createQueue).not.toHaveBeenCalled();
    });

    it('should create a BullMQ queue while BullMQ is still draining', () => {
      const { service, bullMq } = buildHarnessOnBackend({ backend: QueueBackend.SQS_BULLMQ });

      service.createQueue();

      expect(bullMq.createQueue).toHaveBeenCalledTimes(1);
    });
  });

  describe('long delays', () => {
    it('should create a schedule instead of an SQS message', async () => {
      const { service, bullMq, sqs, scheduler } = buildHarnessOnBackend();

      await service.add(longDelayJob());

      expect(scheduler.createDelayedFire).toHaveBeenCalledTimes(1);
      expect(sqs.send).not.toHaveBeenCalled();
      expect(bullMq.add).not.toHaveBeenCalled();
    });

    it('should keep long delays on BullMQ when the scheduler is unconfigured', async () => {
      const { service, bullMq, scheduler } = buildHarnessOnBackend({ schedulerConfigured: false });

      await service.add(longDelayJob());

      expect(bullMq.add).toHaveBeenCalledTimes(1);
      expect(scheduler.createDelayedFire).not.toHaveBeenCalled();
    });

    /**
     * Boot validation demands scheduler config but cannot prove it usable - a
     * queue url the scheduler cannot derive an ARN from leaves `isConfigured`
     * false. Writing to BullMQ there would hit a queue `createQueue` skipped.
     */
    it('should refuse the job in sqs mode when the scheduler is unusable', async () => {
      const { service, bullMq, sqs } = buildHarnessOnBackend({
        backend: QueueBackend.SQS,
        schedulerConfigured: false,
      });

      await expect(service.add(longDelayJob())).rejects.toThrow(/EventBridge Scheduler is not configured/);
      expect(bullMq.add).not.toHaveBeenCalled();
      expect(bullMq.addBulk).not.toHaveBeenCalled();
      expect(sqs.send).not.toHaveBeenCalled();
    });

    it('should pass the defer reason, schedule id and fire time to the scheduler', async () => {
      const { service, scheduler } = buildHarnessOnBackend();
      const before = Date.now();

      await service.add(longDelayJob());

      const [topic, params] = scheduler.createDelayedFire.mock.calls[0];
      expect(topic).toBe(JobTopicNameEnum.STANDARD);
      expect(params).toMatchObject({
        deferReason: DeferReasonEnum.DIGEST,
        organizationId: ORGANIZATION_ID,
        scheduleId: JOB_ID,
        messageBody: JSON.stringify({ _id: JOB_ID, _organizationId: ORGANIZATION_ID }),
      });
      expect(params.fireAt.getTime()).toBeGreaterThanOrEqual(before + LONG_DELAY_MS);
      expect(params.fireAt.getTime()).toBeLessThanOrEqual(Date.now() + LONG_DELAY_MS);
    });

    it('should use the extension-suffixed job id so each extension gets its own schedule', async () => {
      const { service, scheduler } = buildHarnessOnBackend();

      await service.add(
        longDelayJob({
          options: { delay: LONG_DELAY_MS, jobId: `${JOB_ID}-ext2` },
          deferReason: DeferReasonEnum.SCHEDULE_EXTENSION,
        })
      );

      expect(scheduler.createDelayedFire.mock.calls[0][1]).toMatchObject({
        scheduleId: `${JOB_ID}-ext2`,
        deferReason: DeferReasonEnum.SCHEDULE_EXTENSION,
      });
    });

    it('should default the defer reason when a producer does not set one', async () => {
      const { service, scheduler } = buildHarnessOnBackend();

      await service.add(longDelayJob({ deferReason: undefined }));

      expect(scheduler.createDelayedFire.mock.calls[0][1].deferReason).toBe(DeferReasonEnum.DELAY);
    });

    it('should leave short delays on the direct SQS path', async () => {
      const { service, sqs, scheduler } = buildHarnessOnBackend();

      await service.add(longDelayJob({ options: { delay: SHORT_DELAY_MS, jobId: JOB_ID } }));

      expect(sqs.send).toHaveBeenCalledTimes(1);
      expect(sqs.send.mock.calls[0][1]).toMatchObject({ delaySeconds: SHORT_DELAY_MS / 1000 });
      expect(scheduler.createDelayedFire).not.toHaveBeenCalled();
    });
  });

  /**
   * AWS restricts a batch entry `Id` to alphanumerics, hyphens and underscores
   * (80 chars) and a `MessageGroupId` to 128 chars. Neither can be derived
   * unchecked from caller-supplied routing data: inbound mail groups by email
   * domain and names jobs after the raw `Message-ID`.
   */
  describe('SQS message identifiers', () => {
    const AWS_ENTRY_ID = /^[A-Za-z0-9_-]{1,80}$/;

    it('should build entry ids AWS accepts even for domain and Message-ID routing', async () => {
      const { service, sqs } = buildHarnessOnBackend();

      await service.addBulk([
        longDelayJob({ groupId: 'acme.com', name: '<CAF=abc@mail.gmail.com>', options: {} }),
        longDelayJob({ groupId: undefined, name: '<CAF=def@mail.gmail.com>', options: {} }),
      ]);

      const entries = sqs.sendBulk.mock.calls[0][1];
      expect(entries).toHaveLength(2);
      for (const entry of entries) {
        expect(entry.id).toMatch(AWS_ENTRY_ID);
      }
      expect(new Set(entries.map((entry) => entry.id)).size).toBe(2);
    });

    it('should hash a group id past the AWS length cap', async () => {
      const { service, sqs } = buildHarnessOnBackend();

      await service.add(longDelayJob({ groupId: 'x'.repeat(300), options: {} }));

      const { groupId } = sqs.send.mock.calls[0][1];
      expect(groupId).toHaveLength(64);
      expect(groupId).toMatch(/^[0-9a-f]+$/);
    });

    it('should pass a group id within the cap through untouched', async () => {
      const { service, sqs } = buildHarnessOnBackend();

      await service.add(longDelayJob({ options: {} }));

      expect(sqs.send.mock.calls[0][1].groupId).toBe(ORGANIZATION_ID);
    });
  });

  describe('send failures', () => {
    it('should fall back to BullMQ in sqs_bullmq mode', async () => {
      const { service, bullMq, scheduler } = buildHarnessOnBackend();
      scheduler.createDelayedFire.mockRejectedValueOnce(new Error('ThrottlingException'));

      await service.add(longDelayJob());

      expect(bullMq.add).toHaveBeenCalledTimes(1);
    });

    it('should rethrow in sqs mode rather than write to a queue nobody reads', async () => {
      const { service, bullMq, sqs } = buildHarnessOnBackend({ backend: QueueBackend.SQS });
      sqs.send.mockRejectedValueOnce(new Error('ThrottlingException'));

      await expect(service.add(longDelayJob({ options: { delay: SHORT_DELAY_MS } }))).rejects.toThrow(
        'ThrottlingException'
      );
      expect(bullMq.add).not.toHaveBeenCalled();
    });
  });

  /**
   * EventBridge names schedules `${organizationId}-${scheduleId}`, so the
   * tenant cannot fall back to a job id the way the SQS `MessageGroupId` can.
   */
  describe('schedule tenant', () => {
    it('should prefix the schedule name with the organization from groupId', async () => {
      const { service, scheduler } = buildHarnessOnBackend();

      await service.add(longDelayJob({ groupId: ORGANIZATION_ID, data: {} }));

      expect(scheduler.createDelayedFire.mock.calls[0][1].organizationId).toBe(ORGANIZATION_ID);
    });

    it('should fall back to the organization on the job data', async () => {
      const { service, scheduler } = buildHarnessOnBackend();

      await service.add(longDelayJob({ groupId: undefined }));

      expect(scheduler.createDelayedFire.mock.calls[0][1].organizationId).toBe(ORGANIZATION_ID);
    });

    it('should keep a job with no resolvable tenant on BullMQ rather than misname its schedule', async () => {
      const { service, bullMq, scheduler } = buildHarnessOnBackend();

      await service.add(longDelayJob({ groupId: undefined, data: { _id: JOB_ID } }));

      expect(scheduler.createDelayedFire).not.toHaveBeenCalled();
      expect(bullMq.add).toHaveBeenCalledTimes(1);
      expect(bullMq.add.mock.calls[0][1]).toMatchObject({ _id: JOB_ID });
    });

    it('should surface the tenantless job in sqs mode instead of dropping it', async () => {
      const { service, bullMq } = buildHarnessOnBackend({ backend: QueueBackend.SQS });

      await expect(service.add(longDelayJob({ groupId: undefined, data: { _id: JOB_ID } }))).rejects.toThrow(
        /without an organization id/
      );
      expect(bullMq.add).not.toHaveBeenCalled();
    });
  });

  describe('addBulk', () => {
    it('should split a mixed batch between the scheduler and SQS', async () => {
      const { service, sqs, scheduler } = buildHarnessOnBackend();

      await service.addBulk([
        longDelayJob(),
        longDelayJob({ options: { delay: SHORT_DELAY_MS, jobId: 'short-1' }, name: 'short-1' }),
      ] as never);

      expect(scheduler.createDelayedFire).toHaveBeenCalledTimes(1);
      expect(sqs.send).toHaveBeenCalledTimes(1);
    });

    it('should send only the short-delay jobs to SQS when the scheduler is unconfigured', async () => {
      const { service, bullMq, sqs, scheduler } = buildHarnessOnBackend({ schedulerConfigured: false });

      await service.addBulk([
        longDelayJob(),
        longDelayJob({ options: { delay: SHORT_DELAY_MS, jobId: 'short-1' }, name: 'short-1' }),
      ] as never);

      expect(scheduler.createDelayedFire).not.toHaveBeenCalled();
      expect(bullMq.add).toHaveBeenCalledTimes(1);
      expect(sqs.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('partial SQS sends', () => {
    function shortJob(id: string) {
      return longDelayJob({
        name: id,
        data: { _id: id, _organizationId: ORGANIZATION_ID },
        options: { delay: SHORT_DELAY_MS, jobId: id },
      });
    }

    /** Message ids are assigned by `addJobsToSQS` as `${groupId}-${index}`. */
    function unsentMessage(index: number) {
      return { id: `${ORGANIZATION_ID}-${index}`, body: '{}', groupId: ORGANIZATION_ID };
    }

    it('should re-queue only the undelivered jobs', async () => {
      const { service, bullMq, sqs } = buildHarnessOnBackend();
      sqs.sendBulk.mockRejectedValueOnce(
        new SqsPartialSendError([unsentMessage(2)], 2, new Error('BatchRequestTooLong'))
      );

      await service.addBulk([shortJob('a'), shortJob('b'), shortJob('c')] as never);

      expect(bullMq.addBulk).not.toHaveBeenCalled();
      expect(bullMq.add).toHaveBeenCalledTimes(1);
      expect(bullMq.add.mock.calls[0][1]).toMatchObject({ _id: 'c' });
    });

    it('should re-queue every non-contiguous undelivered job', async () => {
      const { service, bullMq, sqs } = buildHarnessOnBackend();
      sqs.sendBulk.mockRejectedValueOnce(
        new SqsPartialSendError([unsentMessage(0), unsentMessage(2)], 1, new Error('BatchRequestTooLong'))
      );

      await service.addBulk([shortJob('a'), shortJob('b'), shortJob('c')] as never);

      expect(bullMq.addBulk).toHaveBeenCalledTimes(1);
      expect(bullMq.addBulk.mock.calls[0][0].map((job: { data: { _id: string } }) => job.data._id)).toEqual(['a', 'c']);
    });

    it('should re-queue every job when the failure does not identify the undelivered ones', async () => {
      const { service, bullMq, sqs } = buildHarnessOnBackend();
      sqs.sendBulk.mockRejectedValueOnce(new Error('AWS.SimpleQueueService.NonExistentQueue'));

      await service.addBulk([shortJob('a'), shortJob('b'), shortJob('c')] as never);

      expect(bullMq.addBulk).toHaveBeenCalledTimes(1);
      expect(bullMq.addBulk.mock.calls[0][0]).toHaveLength(3);
    });

    it('should not re-queue already-scheduled jobs when the SQS leg fails without naming messages', async () => {
      const { service, bullMq, sqs, scheduler } = buildHarnessOnBackend();
      scheduler.createDelayedFire.mockResolvedValueOnce(undefined);
      // A plain error: the single-message path, or an S3 offload failure.
      sqs.send.mockRejectedValueOnce(new Error('ThrottlingException'));

      await service.addBulk([
        longDelayJob({ name: 'long-a', data: { _id: 'long-a', _organizationId: ORGANIZATION_ID } }),
        shortJob('short-b'),
      ] as never);

      expect(scheduler.createDelayedFire).toHaveBeenCalledTimes(1);
      // `long-a` was accepted by EventBridge; replaying it would double-fire it.
      expect(bullMq.addBulk).not.toHaveBeenCalled();
      expect(bullMq.add).toHaveBeenCalledTimes(1);
      expect(bullMq.add.mock.calls[0][1]).toMatchObject({ _id: 'short-b' });
    });

    it('should not touch BullMQ when every message was delivered', async () => {
      const { service, bullMq } = buildHarnessOnBackend();

      await service.addBulk([shortJob('a'), shortJob('b'), shortJob('c')] as never);

      expect(bullMq.add).not.toHaveBeenCalled();
      expect(bullMq.addBulk).not.toHaveBeenCalled();
    });

    it('should re-queue only the jobs the scheduler rejected, plus the ones never attempted', async () => {
      const { service, bullMq, scheduler } = buildHarnessOnBackend();
      scheduler.createDelayedFire.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('Throttling'));

      await service.addBulk([
        longDelayJob({ name: 'long-a', data: { _id: 'long-a', _organizationId: ORGANIZATION_ID } }),
        longDelayJob({ name: 'long-b', data: { _id: 'long-b', _organizationId: ORGANIZATION_ID } }),
        shortJob('short-c'),
      ] as never);

      expect(bullMq.addBulk).toHaveBeenCalledTimes(1);
      expect(bullMq.addBulk.mock.calls[0][0].map((job: { data: { _id: string } }) => job.data._id)).toEqual([
        'long-b',
        'short-c',
      ]);
    });
  });
});
