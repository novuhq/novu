import { Module, OnModuleInit } from '@nestjs/common';
import { WSGateway } from './ws.gateway';
import { SharedModule } from '../shared/shared.module';
import { QueueService } from '../shared/queue';
import { QueueController } from './queue.controller';

@Module({
  imports: [SharedModule],
  providers: [WSGateway],
  controllers: [QueueController],
  exports: [WSGateway],
})
export class SocketModule {}
