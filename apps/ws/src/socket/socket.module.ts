import { Module, Provider } from '@nestjs/common';

import { BullMqService } from '@novu/application-generic';

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
export class SocketModule {}
