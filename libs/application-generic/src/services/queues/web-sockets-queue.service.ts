import { Injectable, Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';
import { IWebSocketBulkJobDto, IWebSocketDataDto, IWebSocketJobDto } from '../../dtos/web-sockets-job.dto';
import { PinoLogger } from '../../logging';
import { BullMqService } from '../bull-mq';
import { WorkflowInMemoryProviderService } from '../in-memory-provider';
import { SocketWorkerService } from '../socket-worker';
import { SqsService } from '../sqs';
import { QueueBaseService } from './queue-base.service';

const LOG_CONTEXT = 'WebSocketsQueueService';

@Injectable()
export class WebSocketsQueueService extends QueueBaseService {
  constructor(
    public workflowInMemoryProviderService: WorkflowInMemoryProviderService,
    private socketWorkerService: SocketWorkerService,
    sqsService: SqsService,
    logger: PinoLogger
  ) {
    super(JobTopicNameEnum.WEB_SOCKETS, new BullMqService(workflowInMemoryProviderService), sqsService, logger);

    Logger.log({ topic: this.topic }, 'Creating queue', LOG_CONTEXT);

    this.createQueue();
    this.logger.setContext(LOG_CONTEXT);
  }

  /** Logs and drops any failure from `operation`. */
  private async bestEffort(operation: () => Promise<void>, context: Record<string, unknown>): Promise<void> {
    try {
      await operation();
    } catch (error) {
      Logger.warn(
        { ...context, error: error instanceof Error ? error.message : String(error) },
        'Failed to publish socket event, dropping it',
        LOG_CONTEXT
      );
    }
  }

  /**
   * Never rejects, unlike every other queue service's `add`.
   *
   * Socket events are a live refresh of state that is already persisted, and
   * several callers fire them without awaiting, so neither the enqueue nor the
   * direct socket-worker leg is worth failing a caller over. A dropped event
   * costs a stale badge count until the next fetch; a rejection here would
   * cost a failed request or an unhandled rejection.
   */
  public async add(data: IWebSocketJobDto): Promise<void> {
    return await this.bestEffort(() => this.publish(data), {
      event: data.data?.event,
      userId: data.data?.userId,
    });
  }

  /** Never rejects, for the same reason as {@link add}. */
  public async addBulk(data: IWebSocketBulkJobDto[]): Promise<void> {
    return await this.bestEffort(() => this.publishBulk(data), { count: data.length });
  }

  /**
   * Logs and drops any send failure rather than rejecting, so that a socket worker outage still
   * leaves the legacy queue push below as a fallback. Returns whether the event was delivered.
   */
  private async sendToSocketWorker(data: IWebSocketDataDto): Promise<boolean> {
    const { userId, event, _environmentId, _organizationId, subscriberId, payload, contextKeys } = data;

    try {
      await this.socketWorkerService.sendMessage({
        userId,
        event,
        data: payload,
        organizationId: _organizationId,
        environmentId: _environmentId,
        subscriberId,
        contextKeys,
      });

      return true;
    } catch (error) {
      Logger.warn(
        { userId, event, error: error instanceof Error ? error.message : String(error) },
        'Failed to send message directly to socket worker',
        LOG_CONTEXT
      );

      return false;
    }
  }

  private async publish(data: IWebSocketJobDto): Promise<void> {
    const isSocketWorkerEnabled = await this.socketWorkerService.isEnabled(data.data?._environmentId);

    if (isSocketWorkerEnabled && data.data) {
      const { userId, event } = data.data;
      const isSent = await this.sendToSocketWorker(data.data);

      if (isSent) {
        Logger.debug({ userId, event }, 'Sent message directly to socket worker', LOG_CONTEXT);
      }

      const isLegacyWsDisabled = await this.socketWorkerService.isLegacyWsDisabled(
        data.data._environmentId,
        data.data._organizationId
      );
      if (isLegacyWsDisabled) {
        Logger.debug({ userId }, 'Legacy WS service is disabled, skipping queue push', LOG_CONTEXT);

        return;
      }
    }

    return await super.add(data);
  }

  private async publishBulk(data: IWebSocketBulkJobDto[]): Promise<void> {
    const firstItem = data.find((item) => item.data);
    const isSocketWorkerEnabled = firstItem
      ? await this.socketWorkerService.isEnabled(firstItem.data?._environmentId)
      : false;

    if (isSocketWorkerEnabled) {
      const results = await Promise.all(
        data.flatMap((item) => (item.data ? [this.sendToSocketWorker(item.data)] : []))
      );

      Logger.debug(
        { sent: results.filter(Boolean).length, count: data.length },
        'Sent messages directly to socket worker',
        LOG_CONTEXT
      );

      const isLegacyWsDisabled = await this.socketWorkerService.isLegacyWsDisabled(
        firstItem?.data?._environmentId,
        firstItem?.data?._organizationId
      );
      if (isLegacyWsDisabled) {
        Logger.debug('Legacy WS service is disabled, skipping bulk queue push', LOG_CONTEXT);

        return;
      }
    }

    await super.addBulk(data);
  }
}
