import { Injectable } from '@nestjs/common';

import { BullMqService } from '@novu/application-generic';

import { SendMessageRoute, SendMessageRouteCommand } from '../usecases';

@Injectable()
export class SocketQueueConsumerService {
  private readonly QUEUE_NAME = 'ws_socket_queue';

  constructor(private sendMessageRoute: SendMessageRoute, private bullMqService: BullMqService) {
    this.bullMqService.createWorker(this.QUEUE_NAME, this.getWorkerProcessor(), this.getWorkerOpts());
  }

  private getWorkerProcessor() {
    return async (job) => {
      await this.sendMessageRoute.execute(
        SendMessageRouteCommand.create({
          userId: job.data.userId,
          event: job.data.event,
          payload: job.data.payload,
          _environmentId: job.data._environmentId,
        })
      );
    };
  }

  private getWorkerOpts() {
    return {
      lockDuration: 90000,
      concurrency: 5,
    };
  }
}
