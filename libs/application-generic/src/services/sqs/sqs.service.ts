import { SQSClient } from '@aws-sdk/client-sqs';
import { Injectable, Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';
import { Producer } from 'sqs-producer';

import { SqsPartialSendError } from './sqs-partial-send.error';
import { SqsPayloadOffloadService } from './sqs-payload-offload.service';
import { ISqsMessage, SQS_BATCH_BYTE_BUDGET, SQS_MAX_BATCH_ENTRIES } from './types';

const LOG_CONTEXT = 'SqsService';

/**
 * Approximate wire size of one batch entry. AWS totals the batched messages
 * against the 1 MiB limit; `Id` and `MessageGroupId` ride along with the body,
 * so all three are counted. The remaining slack lives in
 * {@link SQS_BATCH_BYTE_BUDGET}.
 */
function entrySizeBytes(message: ISqsMessage): number {
  return (
    Buffer.byteLength(message.body, 'utf8') +
    Buffer.byteLength(message.id, 'utf8') +
    Buffer.byteLength(message.groupId ?? '', 'utf8')
  );
}

/**
 * Split messages into groups that respect both the per-batch entry count and
 * the byte budget, so each group becomes exactly one `SendMessageBatch`.
 *
 * A message larger than the budget on its own still gets a group to itself
 * rather than throwing: AWS accepts up to 1 MiB for a single message, and
 * payload offload is a no-op when no bucket is configured, so rejecting it
 * here would break deployments that work today.
 */
export function packMessagesIntoBatches(messages: ISqsMessage[]): ISqsMessage[][] {
  const groups: ISqsMessage[][] = [];
  let current: ISqsMessage[] = [];
  let currentBytes = 0;

  for (const message of messages) {
    const size = entrySizeBytes(message);
    const exceedsCount = current.length >= SQS_MAX_BATCH_ENTRIES;
    const exceedsBytes = currentBytes + size > SQS_BATCH_BYTE_BUDGET;

    if (current.length > 0 && (exceedsCount || exceedsBytes)) {
      groups.push(current);
      current = [];
      currentBytes = 0;
    }

    current.push(message);
    currentBytes += size;
  }

  if (current.length > 0) {
    groups.push(current);
  }

  return groups;
}

/**
 * `sqs-producer` throws `FailedMessagesError` when the batch call succeeded but
 * individual entries were rejected. The class is not exported from the package
 * root, so match on its shape.
 */
function getFailedEntryIds(error: unknown): string[] | undefined {
  const failed = (error as { failedMessages?: unknown })?.failedMessages;

  /*
   * An empty array must not count as "these entries failed" - it would mark the
   * whole group as sent and silently drop it. Requiring entries also rejects
   * `SqsPartialSendError`, whose own list holds messages rather than id strings.
   */
  return Array.isArray(failed) && failed.length > 0 && failed.every((id) => typeof id === 'string')
    ? (failed as string[])
    : undefined;
}

/**
 * Messages left undelivered once the group at `failedIndex` failed: everything
 * in later groups was never attempted, and from the failing group either the
 * entries SQS named or - when the call itself threw - all of them.
 */
function collectUnsentMessages(groups: ISqsMessage[][], failedIndex: number, error: unknown): ISqsMessage[] {
  const failedEntryIds = getFailedEntryIds(error);
  const failedGroup = groups[failedIndex];
  const unsentFromFailedGroup = failedEntryIds
    ? failedGroup.filter((message) => failedEntryIds.includes(message.id))
    : failedGroup;

  return [...unsentFromFailedGroup, ...groups.slice(failedIndex + 1).flat()];
}

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
          // Pinned so the one-API-call-per-group guarantee sendBulk relies on
          // cannot drift with the library default.
          batchSize: SQS_MAX_BATCH_ENTRIES,
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
   * Large payloads are individually offloaded to S3 before sending.
   *
   * Messages are grouped by both entry count and byte size before being handed
   * to `sqs-producer`, which only slices by count and would otherwise build
   * batches that breach the 1 MiB aggregate limit. Each group is sent on its
   * own call so that a failure is attributable to specific messages.
   *
   * @throws {SqsPartialSendError} when some messages were delivered and others
   * were not, so the caller can re-queue only the unsent ones.
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

    const groups = packMessagesIntoBatches(offloadedMessages);

    let sentCount = 0;

    for (const [index, group] of groups.entries()) {
      try {
        // eslint-disable-next-line no-await-in-loop -- sequential keeps the sent/unsent split exact
        await producer.send(group);
        sentCount += group.length;
      } catch (error) {
        const unsent = collectUnsentMessages(groups, index, error);

        Logger.error(
          {
            topic,
            error: error instanceof Error ? error.message : String(error),
            totalCount: offloadedMessages.length,
            sentCount: offloadedMessages.length - unsent.length,
            unsentCount: unsent.length,
          },
          'SQS bulk send failed partway',
          LOG_CONTEXT
        );

        throw new SqsPartialSendError(unsent, offloadedMessages.length - unsent.length, error);
      }
    }

    Logger.debug(
      { message: 'Sent bulk messages to SQS', topic, count: sentCount, batches: groups.length },
      LOG_CONTEXT
    );
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
