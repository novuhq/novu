import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { WorkflowModule } from '../workflows-v2/workflow.module';
import { AiController } from './ai.controller';
import { LlmService } from './services/llm.service';
import { GenerateWorkflowUseCase } from './usecases/generate-workflow';
import { GetSuggestionsUseCase } from './usecases/get-suggestions';

const USE_CASES = [GenerateWorkflowUseCase, GetSuggestionsUseCase];

const SERVICES = [LlmService];

@Module({
  imports: [SharedModule, WorkflowModule],
  controllers: [AiController],
  providers: [...USE_CASES, ...SERVICES],
  exports: [...USE_CASES, ...SERVICES],
})
export class AiModule {}
