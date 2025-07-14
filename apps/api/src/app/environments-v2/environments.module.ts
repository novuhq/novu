import { Module } from '@nestjs/common';
import { EnvironmentsController } from './environments.controller';
import { GetEnvironmentTags } from './usecases/get-environment-tags';
import { PublishEnvironmentUseCase } from './usecases/publish-environment/publish-environment.usecase';
import { DiffEnvironmentUseCase } from './usecases/diff-environment/diff-environment.usecase';
import { WorkflowSyncStrategy } from './usecases/sync-strategies/workflow-sync.strategy';
import { EnvironmentValidationService } from './services';
import { SharedModule } from '../shared/shared.module';
import { WorkflowModule } from '../workflows-v2/workflow.module';

import {
  WorkflowNormalizer,
  WorkflowComparator,
  WorkflowSyncOperation,
  WorkflowDiffOperation,
  WorkflowRepositoryService,
} from './usecases/sync-strategies/workflow';

@Module({
  imports: [SharedModule, WorkflowModule],
  controllers: [EnvironmentsController],
  providers: [
    GetEnvironmentTags,
    PublishEnvironmentUseCase,
    DiffEnvironmentUseCase,
    WorkflowSyncStrategy,
    EnvironmentValidationService,

    WorkflowNormalizer,
    WorkflowComparator,
    WorkflowRepositoryService,
    WorkflowSyncOperation,
    WorkflowDiffOperation,
  ],
  exports: [],
})
export class EnvironmentsModule {}
