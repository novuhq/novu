import { Module, OnModuleInit } from '@nestjs/common';
import { BullmqService, WsQueueService } from '@novu/application-generic';
import { getRedisPrefix } from '@novu/shared';

import { WSGateway } from './ws.gateway';
import { SharedModule } from '../shared/shared.module';

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
      WsQueueService.queueName,
      async (job) => {
        this.wsGateway.sendMessage(job.data.userId, job.data.event, job.data.payload);
      },
      {
        lockDuration: 90000,
        concurrency: 5,
        connection: {
          db: Number(process.env.REDIS_DB_INDEX),
          port: Number(process.env.REDIS_PORT),
          host: process.env.REDIS_HOST,
          password: process.env.REDIS_PASSWORD,
          connectTimeout: 50000,
          keepAlive: 30000,
          family: 4,
          keyPrefix: getRedisPrefix(),
          tls: process.env.REDIS_TLS as any,
        },
      }
    );
  }
}
