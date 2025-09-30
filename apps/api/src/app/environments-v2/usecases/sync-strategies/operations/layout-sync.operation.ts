import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { LayoutEntity } from '@novu/dal';
import { ResourceTypeEnum } from '../../../types/sync.types';
import { LayoutComparatorAdapter } from '../adapters/layout-comparator.adapter';
import { LayoutDeleteAdapter } from '../adapters/layout-delete.adapter';
import { LayoutRepositoryAdapter } from '../adapters/layout-repository.adapter';
import { LayoutSyncAdapter } from '../adapters/layout-sync.adapter';
import { BaseSyncOperation } from '../base/operations/base-sync.operation';

@Injectable()
export class LayoutSyncOperation extends BaseSyncOperation<LayoutEntity> {
  constructor(
    protected logger: PinoLogger,
    protected repositoryAdapter: LayoutRepositoryAdapter,
    protected syncAdapter: LayoutSyncAdapter,
    protected deleteAdapter: LayoutDeleteAdapter,
    protected comparatorAdapter: LayoutComparatorAdapter
  ) {
    super(logger, repositoryAdapter, syncAdapter, deleteAdapter, comparatorAdapter);
  }

  protected getResourceType(): ResourceTypeEnum {
    return ResourceTypeEnum.LAYOUT;
  }

  protected getResourceName(resource: LayoutEntity): string {
    return resource.name || resource.identifier || 'Unnamed Layout';
  }
}
