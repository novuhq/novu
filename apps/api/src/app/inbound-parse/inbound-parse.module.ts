import { MiddlewareConsumer, Module, NestModule, OnApplicationShutdown } from '@nestjs/common';
import { CompileTemplate, WorkflowInMemoryProviderService } from '@novu/application-generic';

import { USE_CASES } from './usecases';
import { InboundParseController } from './inbound-parse.controller';
import { GetMxRecord } from './usecases/get-mx-record/get-mx-record.usecase';

import { SharedModule } from '../shared/shared.module';
import { AuthModule } from '../auth/auth.module';
import { InboundParseWorkerService } from './services/inbound-parse.worker.service';

const PROVIDERS = [GetMxRecord, CompileTemplate, InboundParseWorkerService];

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
