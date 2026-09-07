import { Injectable, Logger } from '@nestjs/common';
import { CommunityOrganizationRepository } from '@novu/dal';
import { JobTopicNameEnum } from '@novu/shared';
import { IWebSocketBulkJobDto, IWebSocketJobDto } from '../../dtos/web-sockets-job.dto';
import { PinoLogger } from '../../logging';
import { BullMqService } from '../bull-mq';
import { FeatureFlagsService } from '../feature-flags';
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
    featureFlagsService: FeatureFlagsService,
    organizationRepository: CommunityOrganizationRepository,
    logger: PinoLogger
  ) {
    super(
      JobTopicNameEnum.WEB_SOCKETS,
      new BullMqService(workflowInMemoryProviderService),
      sqsService,
      featureFlagsService,
      organizationRepository,
      logger
    );

    Logger.log({ topic: this.topic }, 'Creating queue', LOG_CONTEXT);

    this.createQueue();
    this.logger.setContext(LOG_CONTEXT);
  }

  public async add(data: IWebSocketJobDto) {
    const isSocketWorkerEnabled = await this.socketWorkerService.isEnabled(data.data?._environmentId);

    if (isSocketWorkerEnabled && data.data) {
      const { userId, event, _environmentId, _organizationId, subscriberId, payload, contextKeys } = data.data;
      await this.socketWorkerService.sendMessage({
        userId,
        event,
        data: payload,
        organizationId: _organizationId,
        environmentId: _environmentId,
        subscriberId,
        contextKeys,
      });

      Logger.debug({ userId, event }, 'Sent message directly to socket worker', LOG_CONTEXT);

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

  public async addBulk(data: IWebSocketBulkJobDto[]): Promise<void> {
    const firstItem = data.find((item) => item.data);
    const isSocketWorkerEnabled = firstItem
      ? await this.socketWorkerService.isEnabled(firstItem.data?._environmentId)
      : false;

    if (isSocketWorkerEnabled) {
      const promises = data.map(async (item) => {
        if (item.data) {
          const { userId, event, _environmentId, _organizationId, subscriberId, payload, contextKeys } = item.data;

          return this.socketWorkerService.sendMessage({
            userId,
            event,
            data: payload,
            organizationId: _organizationId,
            environmentId: _environmentId,
            subscriberId,
            contextKeys,
          });
        }
      });

      await Promise.all(promises);

      Logger.debug({ count: data.length }, 'Sent messages directly to socket worker', LOG_CONTEXT);

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
