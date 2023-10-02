import { Inject, Module, OnModuleInit, Provider } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';
import { WebSocketsWorkerService } from '@novu/application-generic';

import { WSGateway } from './ws.gateway';
import { SharedModule } from '../shared/shared.module';
import { ExternalServicesRoute } from './usecases/external-services-route';

import { OldInstanceWebSocketsWorker, OldInstanceWebSocketsWorkerService, WebSocketWorker } from './services';

const USE_CASES: Provider[] = [ExternalServicesRoute];

const PROVIDERS: Provider[] = [
  WSGateway,
  OldInstanceWebSocketsWorker,
  OldInstanceWebSocketsWorkerService,
  WebSocketsWorkerService,
  WebSocketWorker,
];

@Module({
  imports: [SharedModule],
  providers: [...PROVIDERS, ...USE_CASES],
  exports: [WSGateway],
})
export class SocketModule {}
