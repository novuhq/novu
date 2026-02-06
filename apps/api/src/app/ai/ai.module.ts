import { Module } from '@nestjs/common';
import { ResourceValidatorService } from '@novu/application-generic';
import { AiChatRepository } from '@novu/dal';
import { IntegrationModule } from '../integrations/integrations.module';
import { SharedModule } from '../shared/shared.module';
import { WorkflowModule } from '../workflows-v2/workflow.module';
import { AiController } from './ai.controller';
import { AiAgentFactory, LlmService } from './services';
import { CheckpointerService } from './services/checkpointer.service';
import { GetChatUseCase } from './usecases/get-chat';
import { GetLatestChatUseCase } from './usecases/get-latest-chat';
import { GetSuggestionsUseCase } from './usecases/get-suggestions';
import { StreamCreateWorkflowUseCase } from './usecases/stream-create-workflow';
import { StreamWorkflowStepsGenerationUseCase } from './usecases/stream-workflow-steps-generation';
import { UpsertChatUseCase } from './usecases/upsert-chat';

const USE_CASES = [
  GetChatUseCase,
  GetLatestChatUseCase,
  GetSuggestionsUseCase,
  StreamCreateWorkflowUseCase,
  StreamWorkflowStepsGenerationUseCase,
  UpsertChatUseCase,
  ResourceValidatorService,
  CheckpointerService,
];

const REPOSITORIES = [AiChatRepository];

const SERVICES = [LlmService, AiAgentFactory];

@Module({
  imports: [SharedModule, WorkflowModule, IntegrationModule],
  controllers: [AiController],
  providers: [...USE_CASES, ...SERVICES, ...REPOSITORIES],
  exports: [...USE_CASES, ...SERVICES],
})
export class AiModule {}
