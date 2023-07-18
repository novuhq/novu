import { Module, OnModuleInit } from '@nestjs/common';
import { BullMqService, WsQueueService } from '@novu/application-generic';
import { getRedisPrefix } from '@novu/shared';

import { WSGateway } from './ws.gateway';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule],
  providers: [WSGateway],
  exports: [WSGateway],
})
export class SocketModule implements OnModuleInit {
  private readonly bullMqService: BullMqService;

  constructor(private wsGateway: WSGateway) {
    this.bullMqService = new BullMqService();
  }

  async onModuleInit() {
    this.bullMqService.createWorker(
      WsQueueService.queueName,
      async (job) => {
        this.wsGateway.sendMessage(job.data.userId, job.data.event, job.data.payload);
      },
      {
        lockDuration: 90000,
        concurrency: 5,
      }
    );
  }
}
