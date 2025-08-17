import { Module } from '@nestjs/common';
import { DeletePreferencesUseCase, GetWorkflowByIdsUseCase } from '@novu/application-generic';
import { LayoutsV2Module } from '../../../layouts-v2/layouts.module';
import { DeleteLayoutUseCase } from '../../../layouts-v2/usecases/delete-layout';
import { LayoutSyncToEnvironmentUseCase } from '../../../layouts-v2/usecases/sync-to-environment';
import { OutboundWebhooksModule } from '../../../outbound-webhooks/outbound-webhooks.module';
import { SharedModule } from '../../../shared/shared.module';
import { DeleteWorkflowUseCase } from '../../../workflows-v1/usecases/delete-workflow/delete-workflow.usecase';
import { SyncToEnvironmentUseCase } from '../../../workflows-v2/usecases/sync-to-environment/sync-to-environment.usecase';
import { WorkflowModule } from '../../../workflows-v2/workflow.module';
import {
  WorkflowComparatorAdapter,
  WorkflowDeleteAdapter,
  WorkflowRepositoryAdapter,
  WorkflowSyncAdapter,
} from './adapters';
import { LayoutComparatorAdapter } from './adapters/layout-comparator.adapter';
import { LayoutDeleteAdapter } from './adapters/layout-delete.adapter';
import { LayoutRepositoryAdapter } from './adapters/layout-repository.adapter';
import { LayoutSyncAdapter } from './adapters/layout-sync.adapter';
import { LayoutComparator } from './comparators/layout.comparator';
import { WorkflowComparator } from './comparators/workflow.comparator';
import { LayoutSyncStrategy } from './layout-sync.strategy';
import { LayoutNormalizer } from './normalizers/layout.normalizer';
import { WorkflowNormalizer } from './normalizers/workflow.normalizer';
import { LayoutDiffOperation } from './operations/layout-diff.operation';
import { LayoutRepositoryService } from './operations/layout-repository.service';
import { LayoutSyncOperation } from './operations/layout-sync.operation';
import { WorkflowDiffOperation } from './operations/workflow-diff.operation';
import { WorkflowRepositoryService } from './operations/workflow-repository.service';
import { WorkflowSyncOperation } from './operations/workflow-sync.operation';
import { WorkflowSyncStrategy } from './workflow-sync.strategy';

@Module({
  imports: [SharedModule, WorkflowModule, LayoutsV2Module, OutboundWebhooksModule.forRoot()],
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
