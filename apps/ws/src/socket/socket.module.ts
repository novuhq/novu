import { Module, OnModuleInit } from '@nestjs/common';
import { BullMqService } from '@novu/application-generic';
import { getRedisPrefix, JobTopicNameEnum } from '@novu/shared';

import { WSGateway } from './ws.gateway';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule],
  providers: [WSGateway],
  exports: [WSGateway],
})
export class SocketModule implements OnModuleInit {
  public readonly bullMqService: BullMqService;

  constructor(private wsGateway: WSGateway) {
    this.bullMqService = new BullMqService();
  }

  async onModuleInit() {
    this.bullMqService.createWorker(
      JobTopicNameEnum.WEB_SOCKETS,
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
