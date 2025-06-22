import { Module } from '@nestjs/common';
import { EnvironmentsController } from './environments.controller';
import { GetEnvironmentTags } from './usecases/get-environment-tags';
import { PublishEnvironmentUseCase } from './usecases/publish-environment/publish-environment.usecase';
import { DiffEnvironmentUseCase } from './usecases/diff-environment/diff-environment.usecase';
import { WorkflowSyncStrategy } from './usecases/sync-strategies/workflow-sync.strategy';
import { TransactionalSyncService } from './services/transactional-sync.service';
import { SharedModule } from '../shared/shared.module';
import { WorkflowModule } from '../workflows-v2/workflow.module';

@Module({
  imports: [SharedModule, WorkflowModule],
  controllers: [EnvironmentsController],
  providers: [
    GetEnvironmentTags,
    PublishEnvironmentUseCase,
    DiffEnvironmentUseCase,
    WorkflowSyncStrategy,
    TransactionalSyncService,
  ],
  exports: [],
})
export class EnvironmentsModule {}
