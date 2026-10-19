import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { NotificationTemplateEntity } from '@novu/dal';
import { ResourceTypeEnum } from '../../../types/sync.types';
import {
  WorkflowComparatorAdapter,
  WorkflowDeleteAdapter,
  WorkflowRepositoryAdapter,
  WorkflowSyncAdapter,
} from '../adapters';
import { BaseSyncOperation } from '../base/operations/base-sync.operation';

@Injectable()
export class WorkflowSyncOperation extends BaseSyncOperation<NotificationTemplateEntity> {
  constructor(
    protected logger: PinoLogger,
    protected repositoryAdapter: WorkflowRepositoryAdapter,
    protected syncAdapter: WorkflowSyncAdapter,
    protected deleteAdapter: WorkflowDeleteAdapter,
    protected comparatorAdapter: WorkflowComparatorAdapter
  ) {
    super(logger, repositoryAdapter, syncAdapter, deleteAdapter, comparatorAdapter);
  }

  protected getResourceType(): ResourceTypeEnum {
    return ResourceTypeEnum.WORKFLOW;
  }

  protected getResourceName(resource: NotificationTemplateEntity): string {
    return resource.name;
  }
}
