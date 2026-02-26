import { Module } from '@nestjs/common';
import { ResourceValidatorService } from '@novu/application-generic';
import { AiChatRepository, SnapshotRepository } from '@novu/dal';
import { GetEnvironmentTags } from '../environments-v2/usecases/get-environment-tags';
import { IntegrationModule } from '../integrations/integrations.module';
import { SharedModule } from '../shared/shared.module';
import { WorkflowModule } from '../workflows-v2/workflow.module';
import { AiController } from './ai.controller';
import { AiAgentFactory, LlmService } from './services';
import { CheckpointerService } from './services/checkpointer.service';
import { CancelStreamUseCase } from './usecases/cancel-stream';
import { GetChatUseCase } from './usecases/get-chat';
import { GetLatestChatUseCase } from './usecases/get-latest-chat';
import { GetSuggestionsUseCase } from './usecases/get-suggestions';
import { KeepAiChangesUseCase } from './usecases/keep-ai-changes';
import { RevertMessageUseCase, RevertResourceFactory, WorkflowRevertStrategy } from './usecases/revert-message';
import { StreamWorkflowGenerationUseCase } from './usecases/stream-workflow-generation';
import { UpsertChatUseCase } from './usecases/upsert-chat';

const USE_CASES = [
  CancelStreamUseCase,
  GetChatUseCase,
  GetLatestChatUseCase,
  GetSuggestionsUseCase,
  KeepAiChangesUseCase,
  RevertMessageUseCase,
  RevertResourceFactory,
  WorkflowRevertStrategy,
  StreamWorkflowGenerationUseCase,
  UpsertChatUseCase,
  ResourceValidatorService,
  CheckpointerService,
  GetEnvironmentTags,
];

const REPOSITORIES = [AiChatRepository, SnapshotRepository];

const SERVICES = [LlmService, AiAgentFactory];

@Module({
  imports: [SharedModule, WorkflowModule, IntegrationModule],
  controllers: [AiController],
  providers: [...USE_CASES, ...SERVICES, ...REPOSITORIES],
  exports: [...USE_CASES, ...SERVICES],
})
export class AiModule {}
