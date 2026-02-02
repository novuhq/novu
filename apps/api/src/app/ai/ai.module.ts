import { Module } from '@nestjs/common';
import { ResourceValidatorService } from '@novu/application-generic';
import { AiChatRepository } from '@novu/dal';
import { SharedModule } from '../shared/shared.module';
import { WorkflowModule } from '../workflows-v2/workflow.module';
import { AiController } from './ai.controller';
import { AiAgentFactory, LlmService } from './services';
import { GetChatUseCase } from './usecases/get-chat';
import { GetLatestChatUseCase } from './usecases/get-latest-chat';
import { GetSuggestionsUseCase } from './usecases/get-suggestions';
import { StreamWorkflowGenerationUseCase } from './usecases/stream-workflow-generation';
import { UpsertChatUseCase } from './usecases/upsert-chat';

const USE_CASES = [
  GetChatUseCase,
  GetLatestChatUseCase,
  GetSuggestionsUseCase,
  StreamWorkflowGenerationUseCase,
  UpsertChatUseCase,
  ResourceValidatorService,
];

const REPOSITORIES = [AiChatRepository];

const SERVICES = [LlmService, AiAgentFactory];

@Module({
  imports: [SharedModule, WorkflowModule],
  controllers: [AiController],
  providers: [...USE_CASES, ...SERVICES, ...REPOSITORIES],
  exports: [...USE_CASES, ...SERVICES],
})
export class AiModule {}
