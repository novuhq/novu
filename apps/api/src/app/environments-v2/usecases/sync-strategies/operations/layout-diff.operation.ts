import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { LayoutEntity } from '@novu/dal';
import { IUserInfo, ResourceTypeEnum } from '../../../types/sync.types';
import { LayoutComparatorAdapter } from '../adapters/layout-comparator.adapter';
import { LayoutRepositoryAdapter } from '../adapters/layout-repository.adapter';
import { BaseDiffOperation } from '../base/operations/base-diff.operation';

@Injectable()
export class LayoutDiffOperation extends BaseDiffOperation<LayoutEntity> {
  constructor(
    protected logger: PinoLogger,
    protected repositoryAdapter: LayoutRepositoryAdapter,
    protected comparatorAdapter: LayoutComparatorAdapter
  ) {
    super(logger, repositoryAdapter, comparatorAdapter);
  }

  protected getResourceType(): ResourceTypeEnum {
    return ResourceTypeEnum.LAYOUT;
  }

  protected getResourceName(resource: LayoutEntity): string {
    return resource.name || resource.identifier || 'Unnamed Layout';
  }

  protected extractUpdatedByInfo(resource: LayoutEntity): IUserInfo | null {
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

  protected extractUpdatedAtInfo(resource: LayoutEntity): string | null {
    if (!resource.updatedAt) {
      return null;
    }

    return resource.updatedAt;
  }
}
