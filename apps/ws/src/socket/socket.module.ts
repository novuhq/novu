import { Inject, Module, OnModuleInit, Provider } from '@nestjs/common';
import { BullMqService } from '@novu/application-generic';
import { JobTopicNameEnum } from '@novu/shared';

import { WSGateway } from './ws.gateway';
import { SharedModule } from '../shared/shared.module';
import { ExternalServicesRoute } from './usecases/external-services-route';
import { SocketQueueConsumerService } from './services/socket-queue-consumer.service';

const USE_CASES: Provider[] = [ExternalServicesRoute];

const SERVICES: Provider[] = [SocketQueueConsumerService, BullMqService];

@Module({
  imports: [SharedModule],
  providers: [WSGateway, ...SERVICES, ...USE_CASES],
  exports: [WSGateway],
})
export class SocketModule implements OnModuleInit {
  constructor(private wsGateway: WSGateway, @Inject(BullMqService) public readonly bullMqService: BullMqService) {}

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
