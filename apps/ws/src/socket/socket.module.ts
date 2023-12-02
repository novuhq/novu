import { Inject, Module, OnModuleInit, Provider } from '@nestjs/common';
import { WebSocketsWorkerService, WorkflowInMemoryProviderService } from '@novu/application-generic';

import { WSGateway } from './ws.gateway';
import { SharedModule } from '../shared/shared.module';
import { ExternalServicesRoute } from './usecases/external-services-route';

import { WebSocketWorker } from './services';

const USE_CASES: Provider[] = [ExternalServicesRoute];

const PROVIDERS: Provider[] = [WSGateway, WebSocketsWorkerService, WebSocketWorker];

@Module({
  imports: [SharedModule],
  providers: [...PROVIDERS, ...USE_CASES],
  exports: [WSGateway],
})
export class SocketModule {}
