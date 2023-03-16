import { Module, OnModuleInit } from '@nestjs/common';
import { WSGateway } from './ws.gateway';
import { SharedModule } from '../shared/shared.module';
import { BullmqService } from '@novu/application-generic';

export const WS_SOCKET_QUEUE = 'ws_socket_queue';

@Module({
  imports: [SharedModule],
  providers: [WSGateway],
  exports: [WSGateway],
})
export class SocketModule implements OnModuleInit {
  private readonly bullMqService: BullmqService;

  constructor(private wsGateway: WSGateway) {
    this.bullMqService = new BullmqService();
  }

  async onModuleInit() {
    this.bullMqService.createWorker(
      WS_SOCKET_QUEUE,
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
