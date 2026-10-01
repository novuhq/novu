import { ConflictException, CreateScheduleCommand, DeleteScheduleCommand } from '@aws-sdk/client-scheduler';
import { JobTopicNameEnum } from '@novu/shared';

import { SqsService } from '../sqs';
import { deriveQueueArnFromUrl, EventBridgeSchedulerService } from './event-bridge-scheduler.service';
import { DeferReasonEnum, SCHEDULER_MAX_INPUT_BYTES } from './types';

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-scheduler', () => {
  const actual = jest.requireActual('@aws-sdk/client-scheduler');

  return {
    ...actual,
    SchedulerClient: jest.fn(() => ({ send: mockSend })),
  };
});

const QUEUE_URL = 'https://sqs.eu-west-2.amazonaws.com/354725113120/novu-standard-queue';
const QUEUE_ARN = 'arn:aws:sqs:eu-west-2:354725113120:novu-standard-queue';
const ROLE_ARN = 'arn:aws:iam::354725113120:role/novu-scheduler-role';
const DLQ_ARN = 'arn:aws:sqs:eu-west-2:354725113120:novu-scheduler-dlq';
const ORGANIZATION_ID = '65f1a2b3c4d5e6f708192a3b';
const JOB_ID = '65f1a2b3c4d5e6f708192a3c';

/** Pass `null` to model a topic that has no SQS queue URL configured. */
function buildSqsService(queueUrl: string | null = QUEUE_URL): SqsService {
  return { getQueueUrl: jest.fn(() => queueUrl ?? undefined) } as unknown as SqsService;
}

function configureEnv(): void {
  process.env.EVENTBRIDGE_SCHEDULER_GROUP_PREFIX = 'novu-test';
  process.env.EVENTBRIDGE_SCHEDULER_ROLE_ARN = ROLE_ARN;
  process.env.EVENTBRIDGE_SCHEDULER_DLQ_ARN = DLQ_ARN;
}

function clearEnv(): void {
  delete process.env.EVENTBRIDGE_SCHEDULER_GROUP_PREFIX;
  delete process.env.EVENTBRIDGE_SCHEDULER_ROLE_ARN;
  delete process.env.EVENTBRIDGE_SCHEDULER_DLQ_ARN;
  delete process.env.EVENTBRIDGE_SCHEDULER_MAX_RETRY_ATTEMPTS;
  delete process.env.EVENTBRIDGE_SCHEDULER_MAX_EVENT_AGE_SECONDS;
}

function createParams(overrides: Record<string, unknown> = {}) {
  return {
    deferReason: DeferReasonEnum.DELAY,
    fireAt: new Date('2026-09-01T10:30:45.123Z'),
    organizationId: ORGANIZATION_ID,
    scheduleId: JOB_ID,
    messageBody: JSON.stringify({ _id: JOB_ID }),
    ...overrides,
  } as Parameters<EventBridgeSchedulerService['createDelayedFire']>[1];
}

describe('EventBridgeSchedulerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearEnv();
    configureEnv();
  });

  afterEach(() => {
    clearEnv();
  });

  describe('isConfigured', () => {
    it('should be configured when the prefix, role, DLQ and queue URL are all present', () => {
      const service = new EventBridgeSchedulerService(buildSqsService());

      expect(service.isConfigured(JobTopicNameEnum.STANDARD)).toBe(true);
    });

    it.each([
      ['EVENTBRIDGE_SCHEDULER_GROUP_PREFIX'],
      ['EVENTBRIDGE_SCHEDULER_ROLE_ARN'],
      ['EVENTBRIDGE_SCHEDULER_DLQ_ARN'],
    ])('should not be configured when %s is missing', (envKey) => {
      delete process.env[envKey];
      const service = new EventBridgeSchedulerService(buildSqsService());

      expect(service.isConfigured(JobTopicNameEnum.STANDARD)).toBe(false);
    });

    it('should not be configured when the topic has no SQS queue URL', () => {
      const service = new EventBridgeSchedulerService(buildSqsService(null));

      expect(service.isConfigured(JobTopicNameEnum.STANDARD)).toBe(false);
    });

    it('should not be configured when the queue URL is not an AWS host', () => {
      const service = new EventBridgeSchedulerService(buildSqsService('http://localhost:4566/000000000000/standard'));

      expect(service.isConfigured(JobTopicNameEnum.STANDARD)).toBe(false);
    });
  });

  describe('createDelayedFire', () => {
    it('should create a self-deleting schedule targeting the SQS queue', async () => {
      const service = new EventBridgeSchedulerService(buildSqsService());

      await service.createDelayedFire(JobTopicNameEnum.STANDARD, createParams());

      expect(mockSend).toHaveBeenCalledTimes(1);
      const command = mockSend.mock.calls[0][0] as CreateScheduleCommand;
      expect(command).toBeInstanceOf(CreateScheduleCommand);
      expect(command.input).toMatchObject({
        Name: `${ORGANIZATION_ID}-${JOB_ID}`,
        GroupName: 'novu-test-delay',
        ScheduleExpression: 'at(2026-09-01T10:30:45)',
        FlexibleTimeWindow: { Mode: 'OFF' },
        ActionAfterCompletion: 'DELETE',
        Target: {
          Arn: QUEUE_ARN,
          RoleArn: ROLE_ARN,
          Input: JSON.stringify({ _id: JOB_ID }),
          DeadLetterConfig: { Arn: DLQ_ARN },
        },
      });
    });

    it('should not set a MessageGroupId, which EventBridge rejects for non-FIFO queues', async () => {
      const service = new EventBridgeSchedulerService(buildSqsService());

      await service.createDelayedFire(JobTopicNameEnum.STANDARD, createParams());

      const command = mockSend.mock.calls[0][0] as CreateScheduleCommand;
      expect(command.input.Target?.SqsParameters).toBeUndefined();
    });

    it.each([
      [DeferReasonEnum.DELAY, 'novu-test-delay'],
      [DeferReasonEnum.DIGEST, 'novu-test-digest'],
      [DeferReasonEnum.THROTTLE, 'novu-test-throttle'],
      [DeferReasonEnum.SNOOZE, 'novu-test-snooze'],
      [DeferReasonEnum.SCHEDULE_EXTENSION, 'novu-test-schedule-extension'],
    ])('should place a %s job in the %s group', async (deferReason, expectedGroup) => {
      const service = new EventBridgeSchedulerService(buildSqsService());

      await service.createDelayedFire(JobTopicNameEnum.STANDARD, createParams({ deferReason }));

      const command = mockSend.mock.calls[0][0] as CreateScheduleCommand;
      expect(command.input.GroupName).toBe(expectedGroup);
    });

    it('should keep the schedule-extension suffix in the schedule name', async () => {
      const service = new EventBridgeSchedulerService(buildSqsService());

      await service.createDelayedFire(
        JobTopicNameEnum.STANDARD,
        createParams({ scheduleId: `${JOB_ID}-ext2`, deferReason: DeferReasonEnum.SCHEDULE_EXTENSION })
      );

      const command = mockSend.mock.calls[0][0] as CreateScheduleCommand;
      expect(command.input.Name).toBe(`${ORGANIZATION_ID}-${JOB_ID}-ext2`);
      expect((command.input.Name as string).length).toBeLessThanOrEqual(64);
    });

    it('should apply the configured retry policy', async () => {
      process.env.EVENTBRIDGE_SCHEDULER_MAX_RETRY_ATTEMPTS = '4';
      process.env.EVENTBRIDGE_SCHEDULER_MAX_EVENT_AGE_SECONDS = '600';
      const service = new EventBridgeSchedulerService(buildSqsService());

      await service.createDelayedFire(JobTopicNameEnum.STANDARD, createParams());

      const command = mockSend.mock.calls[0][0] as CreateScheduleCommand;
      expect(command.input.Target?.RetryPolicy).toEqual({
        MaximumRetryAttempts: 4,
        MaximumEventAgeInSeconds: 600,
      });
    });

    it('should treat a ConflictException as success so producer replays stay idempotent', async () => {
      mockSend.mockRejectedValueOnce(
        new ConflictException({ message: 'already exists', Message: 'already exists', $metadata: {} })
      );
      const service = new EventBridgeSchedulerService(buildSqsService());

      await expect(service.createDelayedFire(JobTopicNameEnum.STANDARD, createParams())).resolves.toBeUndefined();
    });

    it('should propagate other AWS errors so the caller can fall back to BullMQ', async () => {
      mockSend.mockRejectedValueOnce(new Error('ThrottlingException'));
      const service = new EventBridgeSchedulerService(buildSqsService());

      await expect(service.createDelayedFire(JobTopicNameEnum.STANDARD, createParams())).rejects.toThrow(
        'ThrottlingException'
      );
    });

    it('should reject a body larger than the EventBridge input limit', async () => {
      const service = new EventBridgeSchedulerService(buildSqsService());
      const oversized = 'x'.repeat(SCHEDULER_MAX_INPUT_BYTES + 1);

      await expect(
        service.createDelayedFire(JobTopicNameEnum.STANDARD, createParams({ messageBody: oversized }))
      ).rejects.toThrow(/exceeds the EventBridge limit/);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should throw when the topic is not configured', async () => {
      const service = new EventBridgeSchedulerService(buildSqsService(null));

      await expect(service.createDelayedFire(JobTopicNameEnum.STANDARD, createParams())).rejects.toThrow(
        /not configured/
      );
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('deleteSchedule', () => {
    it('should delete the schedule from the reason group', async () => {
      const service = new EventBridgeSchedulerService(buildSqsService());

      await service.deleteSchedule({
        deferReason: DeferReasonEnum.SNOOZE,
        organizationId: ORGANIZATION_ID,
        scheduleId: JOB_ID,
      });

      const command = mockSend.mock.calls[0][0] as DeleteScheduleCommand;
      expect(command).toBeInstanceOf(DeleteScheduleCommand);
      expect(command.input).toEqual({
        Name: `${ORGANIZATION_ID}-${JOB_ID}`,
        GroupName: 'novu-test-snooze',
      });
    });

    it('should be a no-op when the scheduler is not configured', async () => {
      clearEnv();
      const service = new EventBridgeSchedulerService(buildSqsService());

      await service.deleteSchedule({
        deferReason: DeferReasonEnum.SNOOZE,
        organizationId: ORGANIZATION_ID,
        scheduleId: JOB_ID,
      });

      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('deriveQueueArnFromUrl', () => {
    it.each([
      ['https://sqs.eu-west-2.amazonaws.com/354725113120/novu-standard-queue', QUEUE_ARN],
      [
        'https://eu-west-2.queue.amazonaws.com/354725113120/novu-standard-queue',
        'arn:aws:sqs:eu-west-2:354725113120:novu-standard-queue',
      ],
      ['https://sqs.us-gov-west-1.amazonaws.com/354725113120/q', 'arn:aws-us-gov:sqs:us-gov-west-1:354725113120:q'],
      ['https://sqs.cn-north-1.amazonaws.com.cn/354725113120/q', 'arn:aws-cn:sqs:cn-north-1:354725113120:q'],
    ])('should derive an ARN from %s', (url, expected) => {
      expect(deriveQueueArnFromUrl(url)).toBe(expected);
    });

    it.each([
      ['http://localhost:4566/000000000000/standard'],
      ['not-a-url'],
      ['https://sqs.eu-west-2.amazonaws.com/onlyonesegment'],
    ])('should return undefined for the unsupported URL %s', (url) => {
      expect(deriveQueueArnFromUrl(url)).toBeUndefined();
    });
  });
});
