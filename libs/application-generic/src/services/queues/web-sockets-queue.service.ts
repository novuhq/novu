import { Injectable, Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';
import { IWebSocketBulkJobDto, IWebSocketJobDto } from '../../dtos/web-sockets-job.dto';
import { BullMqService } from '../bull-mq';
import { WorkflowInMemoryProviderService } from '../in-memory-provider';
import { SocketWorkerService } from '../socket-worker';
import { QueueBaseService } from './queue-base.service';

const LOG_CONTEXT = 'WebSocketsQueueService';

@Injectable()
export class WebSocketsQueueService extends QueueBaseService {
  constructor(
    public workflowInMemoryProviderService: WorkflowInMemoryProviderService,
    private socketWorkerService: SocketWorkerService
  ) {
    super(JobTopicNameEnum.WEB_SOCKETS, new BullMqService(workflowInMemoryProviderService));

    Logger.log(`Creating queue ${this.topic}`, LOG_CONTEXT);

    this.createQueue();
  }

  public async add(data: IWebSocketJobDto) {
    const isSocketWorkerEnabled = await this.socketWorkerService.isEnabled(data.data?._environmentId);

    if (isSocketWorkerEnabled && data.data) {
      const { userId, event, _environmentId, _organizationId, subscriberId, payload } = data.data;
      await this.socketWorkerService.sendMessage(userId, event, payload, _organizationId, _environmentId, subscriberId);

      Logger.debug(`Sent message directly to socket worker for user ${userId}, event ${event}`, LOG_CONTEXT);
    }

    return await super.add(data);
  }

  public async addBulk(data: IWebSocketBulkJobDto[]): Promise<void> {
    // Check if socket worker is enabled using the first item's context
    const firstItem = data.find((item) => item.data);
    const isSocketWorkerEnabled = firstItem
      ? await this.socketWorkerService.isEnabled(firstItem.data?._environmentId)
      : false;

    if (isSocketWorkerEnabled) {
      const promises = data.map(async (item) => {
        if (item.data) {
          const { userId, event, _environmentId, _organizationId, subscriberId, payload } = item.data;

          return this.socketWorkerService.sendMessage(
            userId,
            event,
            payload,
            _organizationId,
            _environmentId,
            subscriberId
          );
        }
      });

      await Promise.all(promises);

      Logger.debug(`Sent ${data.length} messages directly to socket worker`, LOG_CONTEXT);
    }

    await super.addBulk(data);
  }
}
