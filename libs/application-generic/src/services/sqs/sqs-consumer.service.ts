import { ChangeMessageVisibilityCommand, DeleteMessageCommand, type Message } from '@aws-sdk/client-sqs';
import { Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';
import { Consumer } from 'sqs-consumer';
import { PinoLogger } from '../../logging';
import { SqsService } from './sqs.service';
import { SQS_LARGE_PAYLOAD_MARKER, SqsPayloadOffloadService } from './sqs-payload-offload.service';
import { isSqsRetryError } from './sqs-retry.error';
import {
  ISqsConsumerOptions,
  ISqsMessageMeta,
  SQS_DEFAULT_BATCH_SIZE,
  SQS_DEFAULT_MAX_CONCURRENCY,
  SQS_DEFAULT_VISIBILITY_TIMEOUT,
  SQS_DEFAULT_WAIT_TIME_SECONDS,
  SQS_MAX_VISIBILITY_RENEWAL_MS,
} from './types';

const LOG_CONTEXT = 'SqsConsumerService';

/** AWS's hard ceiling for a single message's visibility timeout (12 hours). */
const SQS_MAX_VISIBILITY_TIMEOUT_SECONDS = 43_200;

/**
 * Bounded retry config for SQS DeleteMessage calls.
 *
 * AWS SDK v3's default retry strategy does NOT classify Node DNS errors
 * (EAI_AGAIN, ENOTFOUND, etc.) as transient, so a single resolver hiccup
 * causes the delete to fail on the first attempt. When that happens after
 * a successful processor run, SQS will redeliver the message after the
 * visibility timeout, leading to duplicate processing. This bounded retry
 * with exponential backoff prevents that for typical sub-second blips.
 */
const DELETE_MAX_ATTEMPTS = 3;
const DELETE_BACKOFF_BASE_MS = 200;
/**
 * Proportional jitter added on top of the exponential backoff (0..25%).
 * Prevents synchronized retry storms when many in-flight deletes hit the
 * same transient failure (e.g. region-wide DNS blip).
 */
const DELETE_BACKOFF_JITTER_FACTOR = 0.25;

/**
 * SQS / AWS service error names that indicate a permanent failure - retrying
 * cannot succeed, so we should log and stop immediately to avoid burning
 * the retry budget and flooding logs.
 *
 * - ReceiptHandleIsInvalid: receipt handle expired (visibility timeout passed)
 *   or never valid; the message will be redelivered regardless of what we do.
 * - InvalidParameterValue / InvalidAddress: malformed request.
 * - AccessDenied / AccessDeniedException: IAM/policy issue, won't self-heal.
 */
const NON_RETRYABLE_DELETE_ERROR_NAMES = new Set([
  'ReceiptHandleIsInvalid',
  'InvalidParameterValue',
  'InvalidAddress',
  'AccessDenied',
  'AccessDeniedException',
]);

function isNonRetryableDeleteError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const errorName = (error as { name?: string }).name;
  const errorCode = (error as { Code?: string; code?: string }).Code ?? (error as { code?: string }).code;

  return (
    (typeof errorName === 'string' && NON_RETRYABLE_DELETE_ERROR_NAMES.has(errorName)) ||
    (typeof errorCode === 'string' && NON_RETRYABLE_DELETE_ERROR_NAMES.has(errorCode))
  );
}

export type SqsMessageProcessor<T = unknown> = (data: T, meta: ISqsMessageMeta) => Promise<void>;

/**
 * Best-effort extraction of identifying fields from the SQS message body for
 * observability. Used in error logs to correlate failures with a specific
 * trigger / tenant / job without dumping the full payload (which can contain
 * PII).
 *
 * Returns `{}` when the body is missing, malformed, or not an object.
 * Returns `{ payloadOffloaded: true }` when the body is an S3-offload pointer
 * (we intentionally do not fetch from S3 just for a log line). Never throws.
 *
 * Supports the field naming used by all queue DTOs:
 * - workflow / subscriber-process: `transactionId`, `identifier`,
 *   `organizationId`, `environmentId`, `userId`, `requestId`, `templateId`
 * - standard: `_id`, `_organizationId`, `_environmentId`, `_userId`
 */
export function extractSqsMessageContext(rawBody: string | undefined): Record<string, string | boolean> {
  if (!rawBody) {
    return {};
  }

  let data: Record<string, unknown>;
  try {
    const parsed = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    data = parsed as Record<string, unknown>;
  } catch {
    return {};
  }

  if (SQS_LARGE_PAYLOAD_MARKER in data) {
    return { payloadOffloaded: true };
  }

  const context: Record<string, string | boolean> = {};
  const pickString = (target: string, ...sources: string[]) => {
    for (const source of sources) {
      const value = data[source];
      if (typeof value === 'string' && value.length > 0) {
        context[target] = value;

        return;
      }
    }
  };

  pickString('transactionId', 'transactionId');
  pickString('identifier', 'identifier');
  pickString('requestId', 'requestId');
  pickString('templateId', 'templateId');
  pickString('organizationId', 'organizationId', '_organizationId');
  pickString('environmentId', 'environmentId', '_environmentId');
  pickString('userId', 'userId', '_userId');
  pickString('jobId', '_id');

  return context;
}

/**
 * In-memory concurrency pool that mirrors BullMQ's Worker.close() lifecycle.
 *
 * - acquire() returns immediately if a slot is free, otherwise queues the caller.
 *   Rejects when the pool is in closing state so no new work is accepted.
 * - release() frees a slot and wakes the next waiting caller
 * - close() enters the closing state: rejects all pending waiters, blocks new acquire()
 * - drain(timeoutMs?) resolves when all active slots are released, or after the
 *   optional timeout (returns false on timeout so callers can log/force-close)
 */
class ConcurrencyPool {
  private active = 0;
  private closing = false;
  private waitQueue: Array<{ resolve: () => void; reject: (err: Error) => void }> = [];
  private drainResolvers: Array<() => void> = [];

  constructor(private readonly max: number) {}

  async acquire(): Promise<void> {
    if (this.closing) {
      throw new Error('Pool is closing, no new work accepted');
    }

    if (this.active < this.max) {
      this.active++;

      return;
    }

    return new Promise<void>((resolve, reject) => {
      this.waitQueue.push({ resolve, reject });
    });
  }

  release(): void {
    this.active--;

    if (this.closing) {
      this.resolveDrainIfEmpty();

      return;
    }

    const next = this.waitQueue.shift();
    if (next) {
      this.active++;
      next.resolve();
    } else {
      this.resolveDrainIfEmpty();
    }
  }

  close(): void {
    this.closing = true;

    for (const waiter of this.waitQueue) {
      waiter.reject(new Error('Pool is closing'));
    }
    this.waitQueue = [];
  }

  /**
   * Wait for all active slots to be released.
   * Returns true if drained cleanly, false if the timeout fired first.
   */
  async drain(timeoutMs?: number): Promise<boolean> {
    if (this.active === 0) {
      return true;
    }

    const drainPromise = new Promise<boolean>((resolve) => {
      this.drainResolvers.push(() => resolve(true));
    });

    if (!timeoutMs) {
      return drainPromise;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<boolean>((resolve) => {
      timer = setTimeout(() => resolve(false), timeoutMs);
    });

    const result = await Promise.race([drainPromise, timeoutPromise]);
    if (timer) {
      clearTimeout(timer);
    }

    return result;
  }

  get activeCount(): number {
    return this.active;
  }

  get waitingCount(): number {
    return this.waitQueue.length;
  }

  get isClosing(): boolean {
    return this.closing;
  }

  private resolveDrainIfEmpty(): void {
    if (this.active === 0 && this.drainResolvers.length > 0) {
      for (const resolve of this.drainResolvers) {
        resolve();
      }
      this.drainResolvers = [];
    }
  }
}

export class SqsConsumerService {
  private consumer: Consumer;
  private pool: ConcurrencyPool;
  private queueUrl: string;
  private payloadOffload?: SqsPayloadOffloadService;
  private visibilityTimeout: number;
  private isStarted = false;
  private isPaused = false;

  constructor(
    private readonly topic: JobTopicNameEnum,
    private readonly sqsService: SqsService,
    private readonly processor: SqsMessageProcessor,
    private readonly logger?: PinoLogger,
    private readonly options: ISqsConsumerOptions = {}
  ) {
    this.queueUrl = this.sqsService.getQueueUrl(this.topic);
    this.payloadOffload = this.sqsService.getPayloadOffloadService();
    if (!this.queueUrl) {
      throw new Error(`No queue URL configured for topic: ${this.topic}`);
    }

    const batchSize = this.options.maxNumberOfMessages ?? SQS_DEFAULT_BATCH_SIZE;
    const waitTime = this.options.waitTimeSeconds ?? SQS_DEFAULT_WAIT_TIME_SECONDS;
    this.visibilityTimeout = this.options.visibilityTimeout ?? SQS_DEFAULT_VISIBILITY_TIMEOUT;
    const maxConcurrency = this.options.maxConcurrency ?? SQS_DEFAULT_MAX_CONCURRENCY;

    this.pool = new ConcurrencyPool(maxConcurrency);

    /*
     * `heartbeatInterval` covers the window where a received message is
     * waiting for a concurrency slot (handleMessage is pending in
     * pool.acquire): sqs-consumer keeps extending its visibility until
     * handleMessage resolves. Once processing is dispatched, our own
     * per-message heartbeat in processAndDelete takes over.
     */
    const heartbeatIntervalSeconds = Math.floor(this.visibilityTimeout / 2);

    this.consumer = Consumer.create({
      queueUrl: this.queueUrl,
      sqs: this.sqsService.getClient(),
      batchSize,
      waitTimeSeconds: waitTime,
      visibilityTimeout: this.visibilityTimeout,
      ...(heartbeatIntervalSeconds > 0 && { heartbeatInterval: heartbeatIntervalSeconds }),
      shouldDeleteMessages: false,
      /*
       * MessageGroupId is the organization id. Requested purely for
       * observability - it is absent from `Message` unless asked for, and it
       * is what lets a slow or failing message be attributed to a tenant.
       * Fairness itself is handled by SQS fair queues, not by this consumer.
       */
      messageSystemAttributeNames: ['ApproximateReceiveCount', 'MessageGroupId'],
      handleMessage: async (message: Message): Promise<Message> => {
        try {
          await this.pool.acquire();
        } catch {
          return message;
        }
        this.processAndDelete(message);

        return message;
      },
    });

    this.setupEventHandlers();

    Logger.log({ topic: this.topic, batchSize, maxConcurrency }, 'SQS consumer initialized', LOG_CONTEXT);
  }

  /**
   * Process a single message and delete it from SQS on success.
   *
   * On success: delete the message from SQS (manual ack), release the slot.
   * On failure: don't delete - SQS retries via visibility timeout, release the slot.
   *
   * A visibility heartbeat runs for the whole processing window, mirroring
   * BullMQ's lock renewal: a slow-but-healthy job keeps its message invisible
   * for as long as the processor is alive, and redelivery only happens when
   * the worker actually dies (heartbeat stops, visibility expires).
   */
  private processAndDelete(message: Message): void {
    const messageId = message.MessageId || 'unknown';
    const startedAt = Date.now();
    const stopVisibilityHeartbeat = this.startVisibilityHeartbeat(message, messageId, startedAt);

    this.processMessage(message)
      .then(async () => {
        /*
         * Must precede the delete: a tick landing after the message is gone
         * always fails with `Message does not exist`, which is indistinguishable
         * in the logs from a genuinely expired visibility. The `finally` below
         * repeats it only as a belt-and-braces guard - `clearInterval` on an
         * already-cleared timer is a no-op.
         */
        stopVisibilityHeartbeat();
        await this.deleteMessageWithRetry(message, messageId);
      })
      .catch(async (error) => {
        stopVisibilityHeartbeat();

        const cause = isSqsRetryError(error) ? error.cause : error;
        Logger.error(
          {
            error: cause instanceof Error ? cause.message : String(cause),
            messageId,
            topic: this.topic,
            processingMs: Date.now() - startedAt,
            ...extractSqsMessageContext(message.Body),
          },
          'SQS message failed, will be retried via visibility timeout',
          LOG_CONTEXT
        );

        if (isSqsRetryError(error)) {
          await this.applyRetryBackoff(message, messageId, error.retryDelayMs);
        }
      })
      .finally(() => {
        stopVisibilityHeartbeat();
        this.pool.release();
      });
  }

  /**
   * Shorten the message's visibility so the retry lands on the worker's
   * requested cadence rather than the consumer-wide flat timeout.
   *
   * Best-effort: if this fails the message still reappears when its current
   * visibility lapses, so the retry happens either way - just later.
   */
  private async applyRetryBackoff(message: Message, messageId: string, retryDelayMs: number): Promise<void> {
    const visibilityTimeout = Math.min(Math.max(Math.ceil(retryDelayMs / 1000), 0), SQS_MAX_VISIBILITY_TIMEOUT_SECONDS);

    try {
      await this.sqsService.getClient().send(
        new ChangeMessageVisibilityCommand({
          QueueUrl: this.queueUrl,
          ReceiptHandle: message.ReceiptHandle,
          VisibilityTimeout: visibilityTimeout,
        })
      );

      this.logger?.debug(
        { messageId, topic: this.topic, retryDelayMs, visibilityTimeout },
        'Applied retry backoff to SQS message visibility'
      );
    } catch (error) {
      Logger.warn(
        {
          error: error instanceof Error ? error.message : String(error),
          messageId,
          topic: this.topic,
          visibilityTimeout,
        },
        'Failed to apply retry backoff, message will retry on the default visibility timeout',
        LOG_CONTEXT
      );
    }
  }

  /**
   * Periodically resets the message's visibility timeout while its processor
   * is running - the SQS equivalent of BullMQ's lock renewal (which extends
   * the job lock at half the lock duration for as long as the worker is
   * alive). Prevents redelivery of long-running jobs and the follow-up
   * `ReceiptHandleIsInvalid` delete failures that push already-processed
   * messages toward the DLQ.
   *
   * Returns a stop function; the caller must invoke it when processing ends
   * (success or failure). The interval is unref'd so it never keeps the
   * process alive on shutdown.
   */
  private startVisibilityHeartbeat(message: Message, messageId: string, startedAt: number): () => void {
    const intervalMs = Math.max(1_000, Math.floor((this.visibilityTimeout * 1000) / 2));
    const receiveCount = parseInt(message.Attributes?.ApproximateReceiveCount || '1', 10);
    const groupId = message.Attributes?.MessageGroupId;
    let extensionCount = 0;

    const timer = setInterval(() => {
      const elapsedMs = Date.now() - startedAt;

      /*
       * Stop renewing a processor that has overrun its budget, so the message
       * is released rather than held until AWS's hard 12h ceiling. The run
       * itself continues - see SQS_MAX_VISIBILITY_RENEWAL_MS for what
       * redelivery does per topic. This log is the actionable signal.
       */
      if (elapsedMs >= SQS_MAX_VISIBILITY_RENEWAL_MS) {
        clearInterval(timer);
        Logger.error(
          {
            messageId,
            topic: this.topic,
            groupId,
            elapsedMs,
            extensionCount,
            receiveCount,
            maxRenewalMs: SQS_MAX_VISIBILITY_RENEWAL_MS,
          },
          'SQS message exceeded the maximum visibility renewal window, releasing it for redelivery',
          LOG_CONTEXT
        );

        return;
      }

      this.sqsService
        .getClient()
        .send(
          new ChangeMessageVisibilityCommand({
            QueueUrl: this.queueUrl,
            ReceiptHandle: message.ReceiptHandle,
            VisibilityTimeout: this.visibilityTimeout,
          })
        )
        .then(() => {
          extensionCount += 1;
          const context = { messageId, topic: this.topic, groupId, elapsedMs, extensionCount, receiveCount };
          const event = 'Extended SQS message visibility (heartbeat)';

          /*
           * Only the first extension is worth an info line - it marks a job
           * crossing into "running long". Later ones are demoted because a slow
           * downstream provider puts every in-flight message over the threshold
           * at once, which is exactly when logs need to stay readable.
           */
          if (extensionCount === 1) {
            Logger.log(context, event, LOG_CONTEXT);
          } else {
            this.logger?.debug(context, event);
          }
        })
        .catch((error: unknown) => {
          const errorName = error instanceof Error ? error.name : undefined;
          // MessageNotInflight / ReceiptHandleIsInvalid: the message already
          // expired or was redelivered - further extensions are pointless.
          const isPermanent = isNonRetryableDeleteError(error) || errorName === 'MessageNotInflight';

          Logger.warn(
            {
              error: error instanceof Error ? error.message : String(error),
              errorName,
              messageId,
              topic: this.topic,
              groupId,
              processingMs: elapsedMs,
              extensionCount,
              receiveCount,
              stoppingHeartbeat: isPermanent,
            },
            'Failed to extend SQS message visibility',
            LOG_CONTEXT
          );

          if (isPermanent) {
            clearInterval(timer);
          }
        });
    }, intervalMs);
    timer.unref();

    return () => clearInterval(timer);
  }

  /**
   * Delete an SQS message with bounded exponential backoff retry.
   *
   * The processor has already succeeded by this point - failing to delete
   * means SQS will redeliver and we'll do duplicate work. We retry a few
   * times to absorb short-lived DNS/network blips before giving up.
   */
  private async deleteMessageWithRetry(message: Message, messageId: string): Promise<void> {
    for (let attempt = 1; attempt <= DELETE_MAX_ATTEMPTS; attempt++) {
      try {
        await this.sqsService.getClient().send(
          new DeleteMessageCommand({
            QueueUrl: this.queueUrl,
            ReceiptHandle: message.ReceiptHandle,
          })
        );

        this.logger?.debug(
          { messageId, topic: this.topic, attempt, maxAttempts: DELETE_MAX_ATTEMPTS },
          'SQS message processed and deleted'
        );

        return;
      } catch (deleteError) {
        const errorMessage = deleteError instanceof Error ? deleteError.message : String(deleteError);
        const errorName = deleteError instanceof Error ? deleteError.name : undefined;
        const isFinalAttempt = attempt === DELETE_MAX_ATTEMPTS;
        const isNonRetryable = isNonRetryableDeleteError(deleteError);

        if (isNonRetryable || isFinalAttempt) {
          Logger.error(
            {
              error: errorMessage,
              errorName,
              messageId,
              topic: this.topic,
              attempt,
              maxAttempts: DELETE_MAX_ATTEMPTS,
              nonRetryable: isNonRetryable,
              ...extractSqsMessageContext(message.Body),
            },
            'Failed to delete SQS message after successful processing',
            LOG_CONTEXT
          );

          return;
        }

        Logger.warn(
          {
            error: errorMessage,
            errorName,
            messageId,
            topic: this.topic,
            attempt,
            maxAttempts: DELETE_MAX_ATTEMPTS,
          },
          'Transient error deleting SQS message, retrying',
          LOG_CONTEXT
        );

        const baseBackoffMs = DELETE_BACKOFF_BASE_MS * 2 ** (attempt - 1);
        const jitterMs = Math.floor(Math.random() * baseBackoffMs * DELETE_BACKOFF_JITTER_FACTOR);
        const backoffMs = baseBackoffMs + jitterMs;
        await new Promise<void>((resolve) => {
          setTimeout(resolve, backoffMs);
        });
      }
    }
  }

  private async processMessage(message: Message): Promise<void> {
    const rawBody = message.Body || '{}';
    const resolvedBody = this.payloadOffload ? await this.payloadOffload.maybeResolve(rawBody) : rawBody;

    const data = JSON.parse(resolvedBody);

    /*
     * The producer decides to offload based on its own bucket config, and
     * `maybeResolve` returns the body untouched when this process has none.
     * Without this check the pointer itself would be handed to the processor
     * as the job payload, running the job with none of its real fields. Fail
     * instead: the message is redelivered and eventually reaches the DLQ.
     */
    if (data && typeof data === 'object' && SQS_LARGE_PAYLOAD_MARKER in data) {
      throw new Error(
        'Received an S3-offloaded SQS payload that could not be resolved. ' +
          'SQS_PAYLOAD_OFFLOAD_BUCKET is set on the producer but not on this consumer.'
      );
    }

    const receiveCount = parseInt(message.Attributes?.ApproximateReceiveCount || '1', 10);
    const meta: ISqsMessageMeta = {
      messageId: message.MessageId || 'unknown',
      receiveCount,
    };

    await this.processor(data, meta);
  }

  private setupEventHandlers(): void {
    this.consumer.on('error', (err) => {
      Logger.error({ error: err.message, topic: this.topic }, 'SQS consumer error', LOG_CONTEXT);
    });

    this.consumer.on('message_processed', (message) => {
      this.logger?.debug(
        {
          messageId: message.MessageId,
          topic: this.topic,
        },
        'SQS message dispatched to processing pool'
      );
    });

    this.consumer.on('started', () => {
      Logger.debug({ topic: this.topic }, 'SQS consumer started (event)', LOG_CONTEXT);
    });

    this.consumer.on('stopped', () => {
      Logger.debug({ topic: this.topic }, 'SQS consumer stopped (event)', LOG_CONTEXT);
    });
  }

  public start(): void {
    if (this.isStarted) {
      Logger.warn({ topic: this.topic }, 'SQS consumer is already running', LOG_CONTEXT);

      return;
    }

    this.consumer.start();
    this.isStarted = true;
    this.isPaused = false;
  }

  public async pause(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    this.consumer.stop({ abort: false });
    this.isStarted = false;
    this.isPaused = true;
    Logger.debug({ topic: this.topic }, 'SQS consumer paused', LOG_CONTEXT);
  }

  public async resume(): Promise<void> {
    if (!this.isPaused) {
      Logger.warn({ topic: this.topic }, 'Cannot resume SQS consumer: not in paused state', LOG_CONTEXT);

      return;
    }

    this.start();
    Logger.debug({ topic: this.topic }, 'SQS consumer resumed', LOG_CONTEXT);
  }

  public async stop(options?: { drainTimeoutMs?: number }): Promise<void> {
    const drainTimeoutMs = options?.drainTimeoutMs;

    if (!this.isStarted) {
      this.pool.close();
      await this.pool.drain(drainTimeoutMs);

      return;
    }

    this.consumer.stop({ abort: false });
    this.isStarted = false;
    this.isPaused = false;
    this.pool.close();

    Logger.log(
      { topic: this.topic, activeSlots: this.pool.activeCount, drainTimeoutMs },
      'SQS consumer stopped, draining in-flight messages',
      LOG_CONTEXT
    );

    const drained = await this.pool.drain(drainTimeoutMs);

    if (drained) {
      Logger.log({ topic: this.topic }, 'SQS consumer fully drained and stopped', LOG_CONTEXT);
    } else {
      Logger.warn(
        { topic: this.topic, activeSlots: this.pool.activeCount },
        'SQS drain timed out, some messages may be reprocessed after visibility timeout',
        LOG_CONTEXT
      );
    }
  }

  public getStatus(): { isRunning: boolean; isPaused: boolean; activeSlots: number; waitingSlots: number } {
    return {
      isRunning: this.consumer.status.isRunning,
      isPaused: this.isPaused,
      activeSlots: this.pool.activeCount,
      waitingSlots: this.pool.waitingCount,
    };
  }
}
