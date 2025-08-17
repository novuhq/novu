import { Module, OnApplicationShutdown, Provider } from '@nestjs/common';
import { FeatureFlagsService, WorkflowInMemoryProviderService } from '@novu/application-generic';
import { SharedModule } from '../shared/shared.module';
import { WebSocketWorker } from './services';
import { ExternalServicesRoute } from './usecases/external-services-route';
import { WSGateway } from './ws.gateway';

export const featureFlagsService = {
  provide: FeatureFlagsService,
  useFactory: async (): Promise<FeatureFlagsService> => {
    const instance = new FeatureFlagsService();
    await instance.initialize();

    return instance;
  },
};

const USE_CASES: Provider[] = [ExternalServicesRoute, featureFlagsService];

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
