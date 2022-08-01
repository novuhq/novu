import { Inject, Module, OnApplicationBootstrap } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { SharedModule } from '../shared/shared.module';
import { TriggerEngineController } from './trigger-engine.controller';
import { USE_CASES } from './usecases';
import { LogsModule } from '../logs/logs.module';
import { ContentTemplatesModule } from '../content-templates/content-templates.module';
import { WorkflowQueueService } from './services/workflow.queue.service';
import { ClientProxy } from '@nestjs/microservices';

@Module({
  imports: [SharedModule, TerminusModule, LogsModule, ContentTemplatesModule],
  controllers: [TriggerEngineController],
  providers: [...USE_CASES, WorkflowQueueService],
})
export class TriggerEngineModule implements OnApplicationBootstrap {
  constructor(@Inject('SUBSCRIBERS_SERVICE') private client: ClientProxy) {}

  async onApplicationBootstrap() {
    await this.client.connect();
  }
}
