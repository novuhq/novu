import type { Message } from '@aws-sdk/client-sqs';
import { Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';
import { Consumer } from 'sqs-consumer';
import { PinoLogger } from '../../logging';
import { SqsService } from './sqs.service';
import { ISqsConsumerOptions } from './types';

const LOG_CONTEXT = 'SqsConsumerService';

export type SqsMessageProcessor<T = any> = (data: T) => Promise<void>;

export class SqsConsumerService {
  private consumer: Consumer;
  private isStarted = false;

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

    this.consumer = Consumer.create({
      queueUrl,
      sqs: this.sqsService.getClient(),
      batchSize: this.options.maxNumberOfMessages || 10,
      waitTimeSeconds: this.options.waitTimeSeconds || 20,
      visibilityTimeout: this.options.visibilityTimeout || 300,
      handleMessageBatch: async (messages: Message[]): Promise<Message[]> => {
        return await this.handleMessageBatch(messages);
      },
    });

    this.setupEventHandlers();
  }

  private async handleMessageBatch(messages: Message[]): Promise<Message[]> {
    const processedMessages: Message[] = [];

    for (const message of messages) {
      try {
        const data = JSON.parse(message.Body || '{}');

        // Skip shadow mode messages
        if (data.skipProcessing) {
          this.logger?.debug(
            {
              messageId: message.MessageId,
              topic: this.topic,
            },
            'Skipping message marked for skip processing'
          );
          processedMessages.push(message);
          continue;
        }

        await this.processor(data);

        // Message processed successfully, acknowledge it
        processedMessages.push(message);
      } catch (error) {
        // Log error but don't add to processedMessages so it stays on queue for retry
        Logger.error(
          {
            error: error instanceof Error ? error.message : String(error),
            messageId: message.MessageId,
            topic: this.topic,
          },
          'Error processing SQS message',
          LOG_CONTEXT
        );
      }
    }

    // Return processed messages to acknowledge and delete them
    return processedMessages;
  }

  private setupEventHandlers(): void {
    this.consumer.on('error', (err) => {
      Logger.error({ error: err.message, topic: this.topic }, 'SQS consumer error', LOG_CONTEXT);
    });

    this.consumer.on('processing_error', (err, message) => {
      Logger.error(
        {
          error: err.message,
          messageId: message.MessageId,
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
          messageId: message.MessageId,
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
  }

  public async pause(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    this.consumer.stop({ abort: false });
    this.isStarted = false;
    Logger.log(`Paused SQS consumer for ${this.topic}`, LOG_CONTEXT);
  }

  public async resume(): Promise<void> {
    if (!this.isStarted) {
      this.start();
      Logger.log(`Resumed SQS consumer for ${this.topic}`, LOG_CONTEXT);
    }
  }

  public async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    this.consumer.stop({ abort: false });
    this.isStarted = false;
  }

  public getStatus(): { isRunning: boolean; isPaused: boolean } {
    return {
      isRunning: this.consumer.status.isRunning,
      isPaused: !this.consumer.status.isRunning && this.isStarted,
    };
  }
}
