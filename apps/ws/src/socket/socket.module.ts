import { Module, OnApplicationShutdown, Provider } from '@nestjs/common';
import { WorkflowInMemoryProviderService } from '@novu/application-generic';

import { WSGateway } from './ws.gateway';
import { SharedModule } from '../shared/shared.module';
import { ExternalServicesRoute } from './usecases/external-services-route';

import { WebSocketWorker } from './services';

const USE_CASES: Provider[] = [ExternalServicesRoute];

const PROVIDERS: Provider[] = [WSGateway, WebSocketWorker];

const memoryQueueService = {
  provide: WorkflowInMemoryProviderService,
  useFactory: async () => {
    const memoryService = new WorkflowInMemoryProviderService();

    await memoryService.initialize();

    return memoryService;
  },
};

@Module({
  imports: [SharedModule],
  providers: [...PROVIDERS, ...USE_CASES, memoryQueueService],
  exports: [WSGateway],
})
export class SocketModule implements OnApplicationShutdown {
  constructor(private workflowInMemoryProviderService: WorkflowInMemoryProviderService) {}

  async onApplicationShutdown() {
    await this.workflowInMemoryProviderService.shutdown();
  }
}
