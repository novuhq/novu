import { CommunityOrganizationRepository } from '@novu/dal';
import { ApiServiceLevelEnum, FeatureFlagsKeysEnum, JobTopicNameEnum, QueueBackendMode } from '@novu/shared';

import { PinoLogger } from '../../logging';
import { BullMqService } from '../bull-mq';
import { FeatureFlagsService } from '../feature-flags';
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
  bullMq: { add: jest.Mock; addBulk: jest.Mock };
  sqs: { isConfigured: jest.Mock; send: jest.Mock; sendBulk: jest.Mock };
  scheduler: { isConfigured: jest.Mock; createDelayedFire: jest.Mock; deleteSchedule: jest.Mock };
  getFlag: jest.Mock;
};

function buildHarness(
  options: {
    sqsConfigured?: boolean;
    schedulerConfigured?: boolean;
    schedulerEnabled?: boolean;
    backendMode?: string;
    organization?: unknown;
  } = {}
): Harness {
  const {
    sqsConfigured = true,
    schedulerConfigured = true,
    schedulerEnabled = true,
    backendMode = QueueBackendMode.COMPLETE,
    organization = { _id: ORGANIZATION_ID, apiServiceLevel: ApiServiceLevelEnum.BUSINESS },
  } = options;

  const bullMq = { add: jest.fn(), addBulk: jest.fn() };
  const sqs = { isConfigured: jest.fn(() => sqsConfigured), send: jest.fn(), sendBulk: jest.fn() };
  const scheduler = {
    isConfigured: jest.fn(() => schedulerConfigured),
    createDelayedFire: jest.fn(),
    deleteSchedule: jest.fn(),
  };

  const getFlag = jest.fn(({ key }: { key: FeatureFlagsKeysEnum }) => {
    if (key === FeatureFlagsKeysEnum.IS_EVENTBRIDGE_SCHEDULER_ENABLED) {
      return Promise.resolve(schedulerEnabled);
    }

    return Promise.resolve(backendMode);
  });

  const service = new QueueBaseService(
    JobTopicNameEnum.STANDARD,
    bullMq as unknown as BullMqService,
    sqs as unknown as SqsService,
    { getFlag } as unknown as FeatureFlagsService,
    { findOne: jest.fn().mockResolvedValue(organization) } as unknown as CommunityOrganizationRepository,
    undefined as unknown as PinoLogger,
    scheduler as unknown as EventBridgeSchedulerService
  );

  return { service, bullMq, sqs, scheduler, getFlag };
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

describe('QueueBaseService long-delay routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should keep long delays on BullMQ when SQS is not configured for the topic', async () => {
    const { service, bullMq, sqs, scheduler } = buildHarness({ sqsConfigured: false });

    await service.add(longDelayJob());

    expect(bullMq.add).toHaveBeenCalledTimes(1);
    expect(scheduler.createDelayedFire).not.toHaveBeenCalled();
    expect(sqs.send).not.toHaveBeenCalled();
  });

  it('should keep long delays on BullMQ while the scheduler flag is off', async () => {
    const { service, bullMq, sqs, scheduler } = buildHarness({ schedulerEnabled: false });

    await service.add(longDelayJob());

    expect(bullMq.add).toHaveBeenCalledTimes(1);
    expect(scheduler.createDelayedFire).not.toHaveBeenCalled();
    expect(sqs.send).not.toHaveBeenCalled();
  });

  it('should keep long delays on BullMQ when the scheduler is unconfigured, without evaluating the flag', async () => {
    const { service, bullMq, scheduler, getFlag } = buildHarness({ schedulerConfigured: false });

    await service.add(longDelayJob());

    expect(bullMq.add).toHaveBeenCalledTimes(1);
    expect(scheduler.createDelayedFire).not.toHaveBeenCalled();
    expect(
      getFlag.mock.calls.some(([args]) => args.key === FeatureFlagsKeysEnum.IS_EVENTBRIDGE_SCHEDULER_ENABLED)
    ).toBe(false);
  });

  it('should create a schedule instead of an SQS message once enabled', async () => {
    const { service, bullMq, sqs, scheduler } = buildHarness();

    await service.add(longDelayJob());

    expect(scheduler.createDelayedFire).toHaveBeenCalledTimes(1);
    expect(sqs.send).not.toHaveBeenCalled();
    expect(bullMq.add).not.toHaveBeenCalled();
  });

  it('should pass the defer reason, schedule id and fire time to the scheduler', async () => {
    const { service, scheduler } = buildHarness();
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
    const { service, scheduler } = buildHarness();

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
    const { service, scheduler } = buildHarness();

    await service.add(longDelayJob({ deferReason: undefined }));

    expect(scheduler.createDelayedFire.mock.calls[0][1].deferReason).toBe(DeferReasonEnum.DELAY);
  });

  it('should fall back to BullMQ when the schedule cannot be created', async () => {
    const { service, bullMq, scheduler } = buildHarness();
    scheduler.createDelayedFire.mockRejectedValueOnce(new Error('ThrottlingException'));

    await service.add(longDelayJob());

    expect(bullMq.add).toHaveBeenCalledTimes(1);
  });

  it('should leave short delays on the direct SQS path', async () => {
    const { service, sqs, scheduler } = buildHarness();

    await service.add(longDelayJob({ options: { delay: SHORT_DELAY_MS, jobId: JOB_ID } }));

    expect(sqs.send).toHaveBeenCalledTimes(1);
    expect(sqs.send.mock.calls[0][1]).toMatchObject({ delaySeconds: SHORT_DELAY_MS / 1000 });
    expect(scheduler.createDelayedFire).not.toHaveBeenCalled();
  });

  it('should honour a BULLMQ backend mode even when the scheduler is enabled', async () => {
    const { service, bullMq, scheduler } = buildHarness({ backendMode: QueueBackendMode.BULLMQ });

    await service.add(longDelayJob());

    expect(bullMq.add).toHaveBeenCalledTimes(1);
    expect(scheduler.createDelayedFire).not.toHaveBeenCalled();
  });

  it('should skip the job entirely when the organization cannot be read', async () => {
    const { service, bullMq, sqs, scheduler } = buildHarness({ organization: null });

    await service.add(longDelayJob());

    expect(bullMq.add).not.toHaveBeenCalled();
    expect(sqs.send).not.toHaveBeenCalled();
    expect(scheduler.createDelayedFire).not.toHaveBeenCalled();
  });

  it('should route a job without an organization id to BullMQ', async () => {
    const { service, bullMq, scheduler } = buildHarness();

    await service.add(longDelayJob({ groupId: undefined }));

    expect(bullMq.add).toHaveBeenCalledTimes(1);
    expect(scheduler.createDelayedFire).not.toHaveBeenCalled();
  });

  describe('addBulk', () => {
    it('should split a mixed batch between the scheduler and SQS', async () => {
      const { service, sqs, scheduler } = buildHarness();

      await service.addBulk([
        longDelayJob(),
        longDelayJob({ options: { delay: SHORT_DELAY_MS, jobId: 'short-1' }, name: 'short-1' }),
      ] as never);

      expect(scheduler.createDelayedFire).toHaveBeenCalledTimes(1);
      expect(sqs.send).toHaveBeenCalledTimes(1);
    });

    it('should send only the short-delay jobs to SQS when the scheduler is off', async () => {
      const { service, bullMq, sqs, scheduler } = buildHarness({ schedulerEnabled: false });

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

    it('should re-queue only the undelivered jobs in COMPLETE mode', async () => {
      const { service, bullMq, sqs } = buildHarness();
      sqs.sendBulk.mockRejectedValueOnce(
        new SqsPartialSendError([unsentMessage(2)], 2, new Error('BatchRequestTooLong'))
      );

      await service.addBulk([shortJob('a'), shortJob('b'), shortJob('c')] as never);

      expect(bullMq.addBulk).not.toHaveBeenCalled();
      expect(bullMq.add).toHaveBeenCalledTimes(1);
      expect(bullMq.add.mock.calls[0][1]).toMatchObject({ _id: 'c' });
    });

    it('should re-queue only the undelivered jobs in LIVE mode', async () => {
      const { service, bullMq, sqs } = buildHarness({ backendMode: QueueBackendMode.LIVE });
      sqs.sendBulk.mockRejectedValueOnce(
        new SqsPartialSendError([unsentMessage(0), unsentMessage(2)], 1, new Error('BatchRequestTooLong'))
      );

      await service.addBulk([shortJob('a'), shortJob('b'), shortJob('c')] as never);

      expect(bullMq.addBulk).toHaveBeenCalledTimes(1);
      expect(bullMq.addBulk.mock.calls[0][0].map((job: { data: { _id: string } }) => job.data._id)).toEqual(['a', 'c']);
    });

    it('should re-queue every job when the failure does not identify the undelivered ones', async () => {
      const { service, bullMq, sqs } = buildHarness();
      sqs.sendBulk.mockRejectedValueOnce(new Error('AWS.SimpleQueueService.NonExistentQueue'));

      await service.addBulk([shortJob('a'), shortJob('b'), shortJob('c')] as never);

      expect(bullMq.addBulk).toHaveBeenCalledTimes(1);
      expect(bullMq.addBulk.mock.calls[0][0]).toHaveLength(3);
    });

    it('should not re-queue already-scheduled jobs when the SQS leg fails without naming messages', async () => {
      const { service, bullMq, sqs, scheduler } = buildHarness();
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
      const { service, bullMq } = buildHarness();

      await service.addBulk([shortJob('a'), shortJob('b'), shortJob('c')] as never);

      expect(bullMq.add).not.toHaveBeenCalled();
      expect(bullMq.addBulk).not.toHaveBeenCalled();
    });

    it('should re-queue only the jobs the scheduler rejected, plus the ones never attempted', async () => {
      const { service, bullMq, scheduler } = buildHarness();
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
