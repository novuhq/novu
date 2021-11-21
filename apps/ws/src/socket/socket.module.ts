import { Module, OnModuleInit } from '@nestjs/common';
import { WSGateway } from './ws.gateway';
import { SharedModule } from '../shared/shared.module';
import { QueueService } from '../shared/queue';

@Module({
  imports: [SharedModule],
  providers: [WSGateway],
  exports: [WSGateway],
})
export class SocketModule implements OnModuleInit {
  constructor(private queueService: QueueService, private wsGateway: WSGateway) {}

  async onModuleInit() {
    this.queueService.wsSocketQueue.process(5, async (job) => {
      this.wsGateway.sendMessage(job.data.userId, job.data.event, job.data.payload);
    });
  }
}
