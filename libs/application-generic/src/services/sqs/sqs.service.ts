import { SQSClient } from '@aws-sdk/client-sqs';
import { Injectable, Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';
import { Producer } from 'sqs-producer';

import { SqsPayloadOffloadService } from './sqs-payload-offload.service';
import { ISqsMessage } from './types';

const LOG_CONTEXT = 'SqsService';

@Injectable()
export class SqsService {
  private client?: SQSClient;
  private queueUrls: Map<JobTopicNameEnum, string>;
  private producers: Map<JobTopicNameEnum, Producer>;
  private payloadOffload?: SqsPayloadOffloadService;

  constructor() {
    this.loadQueueUrls();

    const hasConfiguredQueues = Array.from(this.queueUrls.values()).some((url) => url && url.trim() !== '');

    if (hasConfiguredQueues) {
      this.initializeClient();
      this.initializeProducers();
      this.initializePayloadOffload();
      Logger.log(
        { message: 'SQS service initialized', configuredTopics: Array.from(this.producers.keys()) },
        LOG_CONTEXT
      );
    } else {
      this.producers = new Map();
      Logger.log('SQS service initialized with no queues configured', LOG_CONTEXT);
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
    }

    this.client = new SQSClient(clientConfig);
  }

  private initializePayloadOffload(): void {
    const region = process.env.AWS_REGION || process.env.NOVU_REGION || 'us-east-1';
    const endpoint = process.env.SQS_ENDPOINT;
    this.payloadOffload = new SqsPayloadOffloadService(region, endpoint);
  }

  public getPayloadOffloadService(): SqsPayloadOffloadService | undefined {
    return this.payloadOffload;
  }

  private loadQueueUrls(): void {
    this.queueUrls = new Map([
      [JobTopicNameEnum.STANDARD, process.env.SQS_QUEUE_URL_STANDARD],
      [JobTopicNameEnum.WORKFLOW, process.env.SQS_QUEUE_URL_WORKFLOW],
      [JobTopicNameEnum.PROCESS_SUBSCRIBER, process.env.SQS_QUEUE_URL_PROCESS_SUBSCRIBER],
      [JobTopicNameEnum.WEB_SOCKETS, process.env.SQS_QUEUE_URL_WEB_SOCKETS],
    ]);
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
  }

  private validateConfiguration(): void {
    const missingQueues: string[] = [];

    this.queueUrls.forEach((url, topic) => {
      if (!url || url.trim() === '') {
        missingQueues.push(topic);
      }
    });

    if (missingQueues.length > 0) {
      Logger.warn({ message: 'Missing SQS queue URL configuration', missingTopics: missingQueues }, LOG_CONTEXT);
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
   * Send a single message to SQS.
   * If payload offloading is configured and the body exceeds the size threshold,
   * the body is transparently uploaded to S3 and replaced with an S3 reference.
   */
  public async send(topic: JobTopicNameEnum, message: ISqsMessage): Promise<void> {
    const producer = this.getProducer(topic);
    if (!producer) {
      throw new Error(`No SQS producer configured for topic: ${topic}`);
    }

    const offloadedBody = await this.maybeOffloadBody(message.body, topic, message.id, message.groupId);

    await producer.send({ ...message, body: offloadedBody });
  }

  /**
   * Send multiple messages to SQS in bulk.
   * The sqs-producer will automatically batch them in groups of 10.
   * Large payloads are individually offloaded to S3 before sending.
   */
  public async sendBulk(topic: JobTopicNameEnum, messages: ISqsMessage[]): Promise<void> {
    const producer = this.getProducer(topic);
    if (!producer) {
      throw new Error(`No SQS producer configured for topic: ${topic}`);
    }

    const offloadedMessages = await Promise.all(
      messages.map(async (msg) => {
        const offloadedBody = await this.maybeOffloadBody(msg.body, topic, msg.id, msg.groupId);

        return { ...msg, body: offloadedBody };
      })
    );

    await producer.send(offloadedMessages);

    Logger.debug({ message: 'Sent bulk messages to SQS', topic, count: messages.length }, LOG_CONTEXT);
  }

  private async maybeOffloadBody(body: string, topic: JobTopicNameEnum, id: string, groupId: string): Promise<string> {
    if (!this.payloadOffload?.isConfigured()) {
      return body;
    }

    return this.payloadOffload.maybeOffload(body, topic, id, groupId);
  }

  public async gracefulShutdown(): Promise<void> {
    if (this.client) {
      this.client.destroy();
    }
    Logger.log('SQS service shutdown complete', LOG_CONTEXT);
  }
}
