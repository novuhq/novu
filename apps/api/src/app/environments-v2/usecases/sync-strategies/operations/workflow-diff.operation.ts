import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { NotificationTemplateEntity } from '@novu/dal';
import { ResourceTypeEnum, IUserInfo } from '../../../types/sync.types';
import { BaseDiffOperation } from '../base/operations/base-diff.operation';
import { WorkflowRepositoryAdapter, WorkflowComparatorAdapter } from '../adapters';

@Injectable()
export class WorkflowDiffOperation extends BaseDiffOperation<NotificationTemplateEntity> {
  constructor(
    protected logger: PinoLogger,
    protected repositoryAdapter: WorkflowRepositoryAdapter,
    protected comparatorAdapter: WorkflowComparatorAdapter
  ) {
    super(logger, repositoryAdapter, comparatorAdapter);
  }

  protected getResourceType(): ResourceTypeEnum {
    return ResourceTypeEnum.WORKFLOW;
  }

  protected getResourceName(resource: NotificationTemplateEntity): string {
    return resource.name;
  }

  protected extractUpdatedByInfo(resource: NotificationTemplateEntity): IUserInfo | null {
    if (!resource.updatedBy) {
      return null;
    }

    return {
      _id: resource.updatedBy._id,
      firstName: resource.updatedBy.firstName,
      lastName: resource.updatedBy.lastName,
      externalId: resource.updatedBy.externalId,
    };
  }

  protected extractUpdatedAtInfo(resource: NotificationTemplateEntity): string | null {
    if (!resource.updatedAt) {
      return null;
    }

    return resource.updatedAt;
  }
}
