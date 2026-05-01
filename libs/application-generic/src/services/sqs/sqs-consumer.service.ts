import { DeleteMessageCommand, type Message } from '@aws-sdk/client-sqs';
import { Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';
import { Consumer } from 'sqs-consumer';
import { PinoLogger } from '../../logging';
import { SqsService } from './sqs.service';
import { SqsPayloadOffloadService } from './sqs-payload-offload.service';
import {
  ISqsConsumerOptions,
  ISqsMessageMeta,
  SQS_DEFAULT_BATCH_SIZE,
  SQS_DEFAULT_MAX_CONCURRENCY,
  SQS_DEFAULT_VISIBILITY_TIMEOUT,
  SQS_DEFAULT_WAIT_TIME_SECONDS,
} from './types';

const LOG_CONTEXT = 'SqsConsumerService';

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
    const visibilityTimeout = this.options.visibilityTimeout ?? SQS_DEFAULT_VISIBILITY_TIMEOUT;
    const maxConcurrency = this.options.maxConcurrency ?? SQS_DEFAULT_MAX_CONCURRENCY;

    this.pool = new ConcurrencyPool(maxConcurrency);

    this.consumer = Consumer.create({
      queueUrl: this.queueUrl,
      sqs: this.sqsService.getClient(),
      batchSize,
      waitTimeSeconds: waitTime,
      visibilityTimeout,
      shouldDeleteMessages: false,
      messageSystemAttributeNames: ['ApproximateReceiveCount'],
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
   */
  private processAndDelete(message: Message): void {
    const messageId = message.MessageId || 'unknown';

    this.processMessage(message)
      .then(async () => {
        await this.deleteMessageWithRetry(message, messageId);
      })
      .catch((error) => {
        Logger.error(
          {
            error: error instanceof Error ? error.message : String(error),
            messageId,
            topic: this.topic,
          },
          'SQS message failed, will be retried via visibility timeout',
          LOG_CONTEXT
        );
      })
      .finally(() => {
        this.pool.release();
      });
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
