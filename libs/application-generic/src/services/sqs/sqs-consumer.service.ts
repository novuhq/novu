import { DeleteMessageCommand, type Message } from '@aws-sdk/client-sqs';
import { Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';
import { Consumer } from 'sqs-consumer';
import { PinoLogger } from '../../logging';
import { SqsService } from './sqs.service';
import {
  ISqsConsumerOptions,
  ISqsMessageMeta,
  SQS_DEFAULT_BATCH_SIZE,
  SQS_DEFAULT_MAX_CONCURRENCY,
  SQS_DEFAULT_VISIBILITY_TIMEOUT,
  SQS_DEFAULT_WAIT_TIME_SECONDS,
} from './types';

const LOG_CONTEXT = 'SqsConsumerService';

export type SqsMessageProcessor<T = unknown> = (data: T, meta: ISqsMessageMeta) => Promise<void>;

/**
 * In-memory concurrency pool that mirrors BullMQ's concurrency model.
 * Each slot represents one in-flight message being processed on the event loop.
 *
 * - acquire() returns immediately if a slot is free, otherwise queues the caller
 * - release() frees a slot and wakes the next waiting caller
 * - drain() resolves when all active slots are released (for graceful shutdown)
 */
class ConcurrencyPool {
  private active = 0;
  private waitQueue: Array<{ resolve: () => void }> = [];
  private drainResolvers: Array<() => void> = [];

  constructor(private readonly max: number) {}

  async acquire(): Promise<void> {
    if (this.active < this.max) {
      this.active++;

      return;
    }

    return new Promise<void>((resolve) => {
      this.waitQueue.push({ resolve });
    });
  }

  release(): void {
    this.active--;

    const next = this.waitQueue.shift();
    if (next) {
      this.active++;
      next.resolve();
    } else if (this.active === 0 && this.drainResolvers.length > 0) {
      for (const resolve of this.drainResolvers) {
        resolve();
      }
      this.drainResolvers = [];
    }
  }

  async drain(): Promise<void> {
    if (this.active === 0) {
      return;
    }

    return new Promise<void>((resolve) => {
      this.drainResolvers.push(resolve);
    });
  }

  get activeCount(): number {
    return this.active;
  }

  get waitingCount(): number {
    return this.waitQueue.length;
  }
}

export class SqsConsumerService {
  private consumer: Consumer;
  private pool: ConcurrencyPool;
  private queueUrl: string;
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
        await this.pool.acquire();
        this.processAndDelete(message);

        return message;
      },
    });

    Logger.log(
      {
        topic: this.topic,
        batchSize,
        waitTimeSeconds: waitTime,
        visibilityTimeout,
        maxConcurrency,
      },
      'SQS consumer configured with slot-based concurrency',
      LOG_CONTEXT
    );

    this.setupEventHandlers();
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
        try {
          await this.sqsService.getClient().send(
            new DeleteMessageCommand({
              QueueUrl: this.queueUrl,
              ReceiptHandle: message.ReceiptHandle,
            })
          );

          this.logger?.debug({ messageId, topic: this.topic }, 'SQS message processed and deleted');
        } catch (deleteError) {
          Logger.error(
            {
              error: deleteError instanceof Error ? deleteError.message : String(deleteError),
              messageId,
              topic: this.topic,
            },
            'Failed to delete SQS message after successful processing',
            LOG_CONTEXT
          );
        }
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

  private async processMessage(message: Message): Promise<void> {
    const data = JSON.parse(message.Body || '{}');
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
      Logger.log(`SQS consumer for ${this.topic} started`, LOG_CONTEXT);
    });

    this.consumer.on('stopped', () => {
      Logger.log(`SQS consumer for ${this.topic} stopped`, LOG_CONTEXT);
    });
  }

  public start(): void {
    if (this.isStarted) {
      Logger.warn(`SQS consumer for ${this.topic} is already running`, LOG_CONTEXT);

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
    Logger.log(`Paused SQS consumer for ${this.topic}`, LOG_CONTEXT);
  }

  public async resume(): Promise<void> {
    if (!this.isPaused) {
      Logger.warn(`Cannot resume SQS consumer for ${this.topic}: not in paused state`, LOG_CONTEXT);

      return;
    }

    this.start();
    Logger.log(`Resumed SQS consumer for ${this.topic}`, LOG_CONTEXT);
  }

  public async stop(): Promise<void> {
    if (!this.isStarted) {
      await this.pool.drain();

      return;
    }

    this.consumer.stop({ abort: false });
    this.isStarted = false;
    this.isPaused = false;

    Logger.log(
      { topic: this.topic, activeSlots: this.pool.activeCount },
      'SQS consumer stopped, draining in-flight messages',
      LOG_CONTEXT
    );

    await this.pool.drain();

    Logger.log(`SQS consumer for ${this.topic} fully drained and stopped`, LOG_CONTEXT);
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
