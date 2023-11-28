import { Module, Provider } from '@nestjs/common';

import { WSGateway } from './ws.gateway';
import { SharedModule } from '../shared/shared.module';
import { ExternalServicesRoute } from './usecases/external-services-route';

import { WebSocketWorker } from './services';

const USE_CASES: Provider[] = [ExternalServicesRoute];

const PROVIDERS: Provider[] = [WSGateway, WebSocketWorker];

@Module({
  imports: [SharedModule],
  providers: [...PROVIDERS, ...USE_CASES],
  exports: [WSGateway],
})
export class SocketModule {}
