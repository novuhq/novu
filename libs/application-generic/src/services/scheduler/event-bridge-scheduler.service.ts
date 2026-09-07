import {
  ActionAfterCompletion,
  ConflictException,
  CreateScheduleCommand,
  DeleteScheduleCommand,
  FlexibleTimeWindowMode,
  ResourceNotFoundException,
  SchedulerClient,
} from '@aws-sdk/client-scheduler';
import { Injectable, Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';

import { SqsService } from '../sqs';
import {
  DeferReasonEnum,
  ICreateDelayedFireParams,
  IDeleteScheduleParams,
  SCHEDULER_DEFAULT_MAX_EVENT_AGE_SECONDS,
  SCHEDULER_DEFAULT_MAX_RETRY_ATTEMPTS,
  SCHEDULER_MAX_INPUT_BYTES,
  SCHEDULER_MAX_NAME_LENGTH,
  SCHEDULER_NAME_PATTERN,
} from './types';

const LOG_CONTEXT = 'EventBridgeSchedulerService';

/**
 * Creates one-shot EventBridge schedules for job delays that exceed the SQS
 * per-message cap of 900s. Each schedule targets the standard SQS queue
 * directly and self-deletes once it fires.
 *
 * Fires deliberately carry no `MessageGroupId`: EventBridge Scheduler's
 * templated SQS target rejects it for non-FIFO queues, so long-delay fires
 * arrive without the per-org fair-queue attribution that the direct SQS path
 * sets. Acceptable because they are a small fraction of queue volume.
 */
@Injectable()
export class EventBridgeSchedulerService {
  private client?: SchedulerClient;
  private readonly groupPrefix?: string;
  private readonly roleArn?: string;
  private readonly dlqArn?: string;
  private readonly maxRetryAttempts: number;
  private readonly maxEventAgeSeconds: number;

  constructor(private readonly sqsService: SqsService) {
    this.groupPrefix = normalizeEnv(process.env.EVENTBRIDGE_SCHEDULER_GROUP_PREFIX);
    this.roleArn = normalizeEnv(process.env.EVENTBRIDGE_SCHEDULER_ROLE_ARN);
    this.dlqArn = normalizeEnv(process.env.EVENTBRIDGE_SCHEDULER_DLQ_ARN);
    this.maxRetryAttempts = toPositiveInt(
      process.env.EVENTBRIDGE_SCHEDULER_MAX_RETRY_ATTEMPTS,
      SCHEDULER_DEFAULT_MAX_RETRY_ATTEMPTS
    );
    this.maxEventAgeSeconds = toPositiveInt(
      process.env.EVENTBRIDGE_SCHEDULER_MAX_EVENT_AGE_SECONDS,
      SCHEDULER_DEFAULT_MAX_EVENT_AGE_SECONDS
    );

    if (this.hasCredentials()) {
      const region = process.env.AWS_REGION || process.env.NOVU_REGION || 'us-east-1';
      this.client = new SchedulerClient({ region });
      Logger.log({ groupPrefix: this.groupPrefix, region }, 'EventBridge Scheduler service initialized', LOG_CONTEXT);
    } else {
      Logger.log('EventBridge Scheduler service initialized with no configuration', LOG_CONTEXT);
    }
  }

  /**
   * A schedule is only usable when the group prefix, the execution role and
   * the dead-letter queue are all present: without the DLQ a failed fire is
   * lost with no way to recover the job, which is worse than never leaving
   * BullMQ.
   */
  public isConfigured(topic: JobTopicNameEnum): boolean {
    return this.hasCredentials() && !!this.client && !!this.resolveQueueArn(topic);
  }

  public async createDelayedFire(topic: JobTopicNameEnum, params: ICreateDelayedFireParams): Promise<void> {
    const { deferReason, fireAt, organizationId, scheduleId, messageBody } = params;

    const queueArn = this.resolveQueueArn(topic);
    if (!this.client || !queueArn) {
      throw new Error(`EventBridge Scheduler is not configured for topic: ${topic}`);
    }

    const name = buildScheduleName(organizationId, scheduleId);
    const inputBytes = Buffer.byteLength(messageBody, 'utf8');
    if (inputBytes > SCHEDULER_MAX_INPUT_BYTES) {
      throw new Error(
        `Schedule input of ${inputBytes} bytes exceeds the EventBridge limit of ${SCHEDULER_MAX_INPUT_BYTES}`
      );
    }

    try {
      await this.client.send(
        new CreateScheduleCommand({
          Name: name,
          GroupName: this.buildGroupName(deferReason),
          // The delay is already an absolute instant, so the expression is
          // formatted in UTC and ScheduleExpressionTimezone is left unset
          // (EventBridge defaults to UTC).
          ScheduleExpression: toScheduleExpression(fireAt),
          FlexibleTimeWindow: { Mode: FlexibleTimeWindowMode.OFF },
          ActionAfterCompletion: ActionAfterCompletion.DELETE,
          Target: {
            Arn: queueArn,
            RoleArn: this.roleArn,
            Input: messageBody,
            RetryPolicy: {
              MaximumRetryAttempts: this.maxRetryAttempts,
              MaximumEventAgeInSeconds: this.maxEventAgeSeconds,
            },
            DeadLetterConfig: { Arn: this.dlqArn },
          },
        })
      );

      Logger.debug(
        { topic, name, deferReason, fireAt: fireAt.toISOString(), inputBytes },
        'Created EventBridge schedule for long-delayed job',
        LOG_CONTEXT
      );
    } catch (error) {
      /*
       * A same-name schedule already exists, which means an earlier attempt
       * succeeded and the producer is being replayed (an SQS redelivery of the
       * parent message re-runs AddJob). The job is already scheduled, so this
       * is a success, not a failure to fall back on.
       */
      if (error instanceof ConflictException) {
        Logger.debug({ topic, name, deferReason }, 'EventBridge schedule already exists, skipping', LOG_CONTEXT);

        return;
      }

      throw error;
    }
  }

  /**
   * Deletes a schedule. Only used for snooze, where the job document is
   * removed on unsnooze and a later fire would otherwise fail to find it and
   * churn through SQS redeliveries. A schedule that is already gone (fired, or
   * never created because the job fell back to BullMQ) is not an error.
   */
  public async deleteSchedule(params: IDeleteScheduleParams): Promise<void> {
    const { deferReason, organizationId, scheduleId } = params;

    if (!this.client) {
      return;
    }

    const name = buildScheduleName(organizationId, scheduleId);

    try {
      await this.client.send(new DeleteScheduleCommand({ Name: name, GroupName: this.buildGroupName(deferReason) }));

      Logger.debug({ name, deferReason }, 'Deleted EventBridge schedule', LOG_CONTEXT);
    } catch (error) {
      if (error instanceof ResourceNotFoundException) {
        return;
      }

      throw error;
    }
  }

  public buildGroupName(deferReason: DeferReasonEnum): string {
    return `${this.groupPrefix}-${deferReason}`;
  }

  private hasCredentials(): boolean {
    return !!this.groupPrefix && !!this.roleArn && !!this.dlqArn;
  }

  private resolveQueueArn(topic: JobTopicNameEnum): string | undefined {
    const queueUrl = this.sqsService?.getQueueUrl(topic);

    return queueUrl ? deriveQueueArnFromUrl(queueUrl) : undefined;
  }
}

function normalizeEnv(value: string | undefined): string | undefined {
  return value && value.trim() !== '' ? value.trim() : undefined;
}

function toPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

/** `at()` takes a local-to-the-schedule-timezone stamp with no offset suffix. */
function toScheduleExpression(fireAt: Date): string {
  return `at(${fireAt.toISOString().slice(0, 19)})`;
}

/**
 * The org prefix makes schedules enumerable per tenant via
 * `ListSchedules --name-prefix`. Two ObjectIds plus a separator is 49
 * characters, and the `-ext{N}` suffix a schedule extension carries adds a
 * handful more, so the AWS 64-character ceiling is never a practical concern.
 */
export function buildScheduleName(organizationId: string, scheduleId: string): string {
  const name = `${organizationId}-${scheduleId}`;

  if (name.length > SCHEDULER_MAX_NAME_LENGTH) {
    throw new Error(`Schedule name '${name}' exceeds the ${SCHEDULER_MAX_NAME_LENGTH} character limit`);
  }

  if (!SCHEDULER_NAME_PATTERN.test(name)) {
    throw new Error(`Schedule name '${name}' contains characters EventBridge does not accept`);
  }

  return name;
}

/**
 * SQS exposes queues by URL but EventBridge targets them by ARN, and the
 * deployment already configures the URL. Supports both the modern
 * (`sqs.{region}.amazonaws.com`) and legacy (`{region}.queue.amazonaws.com`)
 * host forms; anything else (LocalStack) yields no ARN, which disables the
 * scheduler path rather than emitting a malformed target.
 */
export function deriveQueueArnFromUrl(queueUrl: string): string | undefined {
  let url: URL;
  try {
    url = new URL(queueUrl);
  } catch {
    return undefined;
  }

  const [accountId, queueName] = url.pathname.split('/').filter(Boolean);
  if (!accountId || !queueName) {
    return undefined;
  }

  const region = extractRegion(url.hostname);
  if (!region) {
    return undefined;
  }

  return `arn:${partitionForRegion(region)}:sqs:${region}:${accountId}:${queueName}`;
}

function extractRegion(hostname: string): string | undefined {
  const modern = /^sqs\.([a-z0-9-]+)\.amazonaws\.com(\.cn)?$/.exec(hostname);
  if (modern) {
    return modern[1];
  }

  const legacy = /^([a-z0-9-]+)\.queue\.amazonaws\.com(\.cn)?$/.exec(hostname);
  if (legacy) {
    return legacy[1];
  }

  return undefined;
}

function partitionForRegion(region: string): string {
  if (region.startsWith('us-gov-')) {
    return 'aws-us-gov';
  }

  if (region.startsWith('cn-')) {
    return 'aws-cn';
  }

  return 'aws';
}
