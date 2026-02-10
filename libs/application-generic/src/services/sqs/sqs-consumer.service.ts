import type { Message } from '@aws-sdk/client-sqs';
import { Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';
import { Consumer } from 'sqs-consumer';
import { PinoLogger } from '../../logging';
import { SqsService } from './sqs.service';
import { ISqsConsumerOptions, ISqsMessageMeta } from './types';

const LOG_CONTEXT = 'SqsConsumerService';

export type SqsMessageProcessor<T = unknown> = (data: T, meta: ISqsMessageMeta) => Promise<void>;

export class SqsConsumerService {
  private consumer: Consumer;
  private isStarted = false;
  private isPaused = false;

  constructor(
    private readonly topic: JobTopicNameEnum,
    private readonly sqsService: SqsService,
    private readonly processor: SqsMessageProcessor,
    private readonly logger?: PinoLogger,
    private readonly options: ISqsConsumerOptions = {}
  ) {
    const queueUrl = this.sqsService.getQueueUrl(this.topic);
    if (!queueUrl) {
      throw new Error(`No queue URL configured for topic: ${this.topic}`);
    }

    const batchSize = this.options.maxNumberOfMessages ?? 10;
    const waitTime = this.options.waitTimeSeconds ?? 20;
    const visibilityTimeout = this.options.visibilityTimeout ?? 90;

    this.consumer = Consumer.create({
      queueUrl,
      sqs: this.sqsService.getClient(),
      batchSize,
      waitTimeSeconds: waitTime,
      visibilityTimeout,
      messageSystemAttributeNames: ['ApproximateReceiveCount'],
      handleMessageBatch: async (messages: Message[]): Promise<Message[]> => {
        return await this.processMessageBatch(messages);
      },
    });

    Logger.log(
      {
        topic: this.topic,
        batchSize,
        waitTimeSeconds: waitTime,
        visibilityTimeout,
      },
      'SQS consumer configured with parallel batch processing',
      LOG_CONTEXT
    );

    this.setupEventHandlers();
  }

  private async processMessageBatch(messages: Message[]): Promise<Message[]> {
    const results = await Promise.allSettled(messages.map((message) => this.processMessage(message)));

    const successfulMessages: Message[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulMessages.push(messages[index]);
      } else {
        Logger.error(
          {
            error: result.reason instanceof Error ? result.reason.message : String(result.reason),
            messageId: messages[index].MessageId,
            topic: this.topic,
          },
          'SQS message failed, will be retried via visibility timeout',
          LOG_CONTEXT
        );
      }
    });

    this.logger?.debug(
      {
        topic: this.topic,
        total: messages.length,
        succeeded: successfulMessages.length,
        failed: messages.length - successfulMessages.length,
      },
      'SQS batch processing complete'
    );

    return successfulMessages;
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

    this.consumer.on('processing_error', (err, message) => {
      Logger.error(
        {
          error: err.message,
          messageId: message?.MessageId,
          topic: this.topic,
        },
        'SQS message processing error',
        LOG_CONTEXT
      );
    });

    this.consumer.on('timeout_error', (err, message) => {
      Logger.error(
        {
          error: err.message,
          messageId: message?.MessageId,
          topic: this.topic,
        },
        'SQS message timeout error',
        LOG_CONTEXT
      );
    });

    this.consumer.on('message_processed', (message) => {
      this.logger?.debug(
        {
          messageId: message.MessageId,
          topic: this.topic,
        },
        'SQS message processed successfully'
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
      return;
    }

    this.consumer.stop({ abort: false });
    this.isStarted = false;
    this.isPaused = false;
  }

  public getStatus(): { isRunning: boolean; isPaused: boolean } {
    return {
      isRunning: this.consumer.status.isRunning,
      isPaused: this.isPaused,
    };
  }
}
