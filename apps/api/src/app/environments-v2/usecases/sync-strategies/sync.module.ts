import { Module } from '@nestjs/common';
import { DeletePreferencesUseCase, GetWorkflowByIdsUseCase } from '@novu/application-generic';
import { SharedModule } from '../../../shared/shared.module';
import { WorkflowSyncOperation } from './operations/workflow-sync.operation';
import { WorkflowDiffOperation } from './operations/workflow-diff.operation';
import { WorkflowRepositoryService } from './operations/workflow-repository.service';
import { WorkflowComparator } from './comparators/workflow.comparator';
import {
  WorkflowRepositoryAdapter,
  WorkflowSyncAdapter,
  WorkflowDeleteAdapter,
  WorkflowComparatorAdapter,
} from './adapters';
import { SyncToEnvironmentUseCase } from '../../../workflows-v2/usecases/sync-to-environment/sync-to-environment.usecase';
import { DeleteWorkflowUseCase } from '../../../workflows-v1/usecases/delete-workflow/delete-workflow.usecase';
import { WorkflowNormalizer } from './normalizers/workflow.normalizer';
import { WorkflowSyncStrategy } from './workflow-sync.strategy';
import { DeleteLayoutUseCase } from '../../../layouts-v2/usecases/delete-layout';
import { LayoutSyncStrategy } from './layout-sync.strategy';
import { LayoutRepositoryService } from './operations/layout-repository.service';
import { LayoutNormalizer } from './normalizers/layout.normalizer';
import { LayoutComparator } from './comparators/layout.comparator';
import { LayoutRepositoryAdapter } from './adapters/layout-repository.adapter';
import { LayoutSyncAdapter } from './adapters/layout-sync.adapter';
import { LayoutDeleteAdapter } from './adapters/layout-delete.adapter';
import { LayoutComparatorAdapter } from './adapters/layout-comparator.adapter';
import { LayoutSyncOperation } from './operations/layout-sync.operation';
import { LayoutDiffOperation } from './operations/layout-diff.operation';
import { LayoutSyncToEnvironmentUseCase } from '../../../layouts-v2/usecases/sync-to-environment';
import { WorkflowModule } from '../../../workflows-v2/workflow.module';
import { LayoutsV2Module } from '../../../layouts-v2/layouts.module';

@Module({
  imports: [SharedModule, WorkflowModule, LayoutsV2Module],
  providers: [
    // Repository services
    WorkflowRepositoryService,
    LayoutRepositoryService,

    // Normalizers
    WorkflowNormalizer,
    LayoutNormalizer,

    // Comparators
    WorkflowComparator,
    LayoutComparator,

    // Adapters
    WorkflowRepositoryAdapter,
    WorkflowSyncAdapter,
    WorkflowDeleteAdapter,
    WorkflowComparatorAdapter,
    LayoutRepositoryAdapter,
    LayoutSyncAdapter,
    LayoutDeleteAdapter,
    LayoutComparatorAdapter,

    // Operations
    WorkflowSyncOperation,
    WorkflowDiffOperation,
    LayoutSyncOperation,
    LayoutDiffOperation,

    // Usecases
    SyncToEnvironmentUseCase,
    DeleteWorkflowUseCase,
    GetWorkflowByIdsUseCase,
    DeletePreferencesUseCase,
    LayoutSyncToEnvironmentUseCase,
    DeleteLayoutUseCase,

    // Strategies
    WorkflowSyncStrategy,
    LayoutSyncStrategy,
  ],
  exports: [WorkflowSyncStrategy, LayoutSyncStrategy],
})
export class SyncModule {}
