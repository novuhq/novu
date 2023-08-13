import { Injectable, Logger } from '@nestjs/common';

import { BullMqService } from '@novu/application-generic';
import { JobTopicNameEnum } from '@novu/shared';

import { ExternalServicesRoute, ExternalServicesRouteCommand } from '../usecases/external-services-route';

@Injectable()
export class SocketQueueConsumerService {
  LOG_CONTEXT = 'SocketQueueConsumerService';

  constructor(private externalServicesRoute: ExternalServicesRoute, public bullMqService: BullMqService) {
    this.bullMqService.createWorker(JobTopicNameEnum.WEB_SOCKETS, this.getWorkerProcessor(), this.getWorkerOpts());
  }

  private getWorkerProcessor() {
    return async (job) => {
      try {
        await this.externalServicesRoute.execute(
          ExternalServicesRouteCommand.create({
            userId: job.data.userId,
            event: job.data.event,
            payload: job.data.payload,
            _environmentId: job.data._environmentId,
          })
        );
      } catch (e) {
        // eslint-disable-next-line no-console
        Logger.error('Unexpected exception occurred while handling external services route ', e, this.LOG_CONTEXT);

        throw e;
      }
    };
  }

  private getWorkerOpts() {
    return {
      lockDuration: 90000,
      concurrency: 5,
    };
  }
}
