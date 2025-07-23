import { Module } from '@nestjs/common';
import { EnvironmentsController } from './environments.controller';
import { GetEnvironmentTags } from './usecases/get-environment-tags';
import { PublishEnvironmentUseCase } from './usecases/publish-environment/publish-environment.usecase';
import { DiffEnvironmentUseCase } from './usecases/diff-environment/diff-environment.usecase';
import { EnvironmentValidationService, DependencyAnalyzerService } from './services';
import { SharedModule } from '../shared/shared.module';
import { WorkflowModule } from '../workflows-v2/workflow.module';
import { SyncModule } from './usecases/sync-strategies/sync.module';

@Module({
  imports: [SharedModule, WorkflowModule, SyncModule],
  controllers: [EnvironmentsController],
  providers: [
    GetEnvironmentTags,
    PublishEnvironmentUseCase,
    DiffEnvironmentUseCase,
    EnvironmentValidationService,
    DependencyAnalyzerService,
  ],
  exports: [],
})
export class EnvironmentsModule {}
