import { MiddlewareConsumer, Module, NestModule, OnApplicationShutdown } from '@nestjs/common';
import { CompileTemplate, WorkflowInMemoryProviderService } from '@novu/application-generic';

import { USE_CASES } from './usecases';
import { InboundParseController } from './inbound-parse.controller';

import { SharedModule } from '../shared/shared.module';
import { AuthModule } from '../auth/auth.module';

const PROVIDERS = [CompileTemplate];

const memoryQueueService = {
  provide: WorkflowInMemoryProviderService,
  useFactory: async () => {
    const memoryService = new WorkflowInMemoryProviderService();

    await memoryService.initialize();

    return memoryService;
  },
};
@Module({
  imports: [SharedModule, AuthModule],
  controllers: [InboundParseController],
  providers: [...PROVIDERS, ...USE_CASES, memoryQueueService],
  exports: [...USE_CASES],
})
export class InboundParseModule implements NestModule, OnApplicationShutdown {
  constructor(private workflowInMemoryProviderService: WorkflowInMemoryProviderService) {}
  configure(consumer: MiddlewareConsumer): MiddlewareConsumer | void {}

  async onApplicationShutdown() {
    await this.workflowInMemoryProviderService.shutdown();
  }
}
