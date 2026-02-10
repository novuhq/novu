import { SQSClient } from '@aws-sdk/client-sqs';
import { Injectable, Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';
import { Producer } from 'sqs-producer';

const LOG_CONTEXT = 'SqsService';

@Injectable()
export class SqsService {
  private client?: SQSClient;
  private queueUrls: Map<JobTopicNameEnum, string>;
  private producers: Map<JobTopicNameEnum, Producer>;

  constructor() {
    this.loadQueueUrls();

    const hasConfiguredQueues = Array.from(this.queueUrls.values()).some((url) => url && url.trim() !== '');

    if (hasConfiguredQueues) {
      this.initializeClient();
      this.initializeProducers();
    } else {
      this.producers = new Map();
      Logger.log('No SQS queue URLs configured, skipping client initialization', LOG_CONTEXT);
    }

    this.validateConfiguration();
  }

  private initializeClient(): void {
    const region = process.env.AWS_REGION || process.env.NOVU_REGION || 'us-east-1';
    const endpoint = process.env.SQS_ENDPOINT;

    const clientConfig: any = {
      region,
    };

    if (endpoint) {
      clientConfig.endpoint = endpoint;
      Logger.log(`Using custom SQS endpoint: ${endpoint}`, LOG_CONTEXT);
    }

    this.client = new SQSClient(clientConfig);
    Logger.log(`SQS client initialized for region: ${region}`, LOG_CONTEXT);
  }

  private loadQueueUrls(): void {
    this.queueUrls = new Map([
      [JobTopicNameEnum.STANDARD, process.env.SQS_QUEUE_URL_STANDARD],
      [JobTopicNameEnum.WORKFLOW, process.env.SQS_QUEUE_URL_WORKFLOW],
      [JobTopicNameEnum.PROCESS_SUBSCRIBER, process.env.SQS_QUEUE_URL_PROCESS_SUBSCRIBER],
      [JobTopicNameEnum.WEB_SOCKETS, process.env.SQS_QUEUE_URL_WEB_SOCKETS],
    ]);

    Logger.log('SQS queue URLs loaded from environment variables', LOG_CONTEXT);
  }

  private initializeProducers(): void {
    this.producers = new Map();

    this.queueUrls.forEach((queueUrl, topic) => {
      if (queueUrl && queueUrl.trim() !== '') {
        const producer = Producer.create({
          queueUrl,
          sqs: this.client,
        });
        this.producers.set(topic, producer);
      }
    });

    Logger.log('SQS producers initialized', LOG_CONTEXT);
  }

  private validateConfiguration(): void {
    const missingQueues: string[] = [];

    this.queueUrls.forEach((url, topic) => {
      if (!url || url.trim() === '') {
        missingQueues.push(topic);
      }
    });

    if (missingQueues.length > 0) {
      const message = `Missing SQS queue URL configuration for topics: ${missingQueues.join(', ')}`;
      Logger.warn(message, LOG_CONTEXT);
    } else {
      Logger.log('All SQS queue URLs are configured', LOG_CONTEXT);
    }
  }

  public getQueueUrl(topic: JobTopicNameEnum): string | undefined {
    const url = this.queueUrls.get(topic);
    return url && url.trim() !== '' ? url : undefined;
  }

  public isConfigured(topic: JobTopicNameEnum): boolean {
    const url = this.queueUrls.get(topic);
    return url !== undefined && url.trim() !== '';
  }

  public getClient(): SQSClient {
    if (!this.client) {
      throw new Error('SQS client not initialized - no queues are configured');
    }

    return this.client;
  }

  public getProducer(topic: JobTopicNameEnum): Producer | undefined {
    return this.producers.get(topic);
  }

  /**
   * Send a single message to SQS
   */
  public async send(topic: JobTopicNameEnum, message: { id: string; body: string; groupId: string }): Promise<void> {
    const producer = this.getProducer(topic);
    if (!producer) {
      throw new Error(`No SQS producer configured for topic: ${topic}`);
    }

    await producer.send(message);
  }

  /**
   * Send multiple messages to SQS in bulk
   * The sqs-producer will automatically batch them in groups of 10
   */
  public async sendBulk(
    topic: JobTopicNameEnum,
    messages: Array<{ id: string; body: string; groupId: string }>
  ): Promise<void> {
    const producer = this.getProducer(topic);
    if (!producer) {
      throw new Error(`No SQS producer configured for topic: ${topic}`);
    }

    // sqs-producer will automatically batch messages (default: 10 per batch)
    await producer.send(messages);

    Logger.log({ topic, count: messages.length }, 'Sent bulk messages to SQS', LOG_CONTEXT);
  }

  public async gracefulShutdown(): Promise<void> {
    Logger.log('Shutting down SQS service', LOG_CONTEXT);
    if (this.client) {
      this.client.destroy();
    }
    Logger.log('SQS service shutdown complete', LOG_CONTEXT);
  }
}
