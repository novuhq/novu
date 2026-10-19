import { Injectable } from '@nestjs/common';
import { LayoutEntity } from '@novu/dal';
import { IBaseRepositoryService } from '../base/interfaces/base-repository.interface';
import { LayoutRepositoryService } from '../operations/layout-repository.service';

@Injectable()
export class LayoutRepositoryAdapter implements IBaseRepositoryService<LayoutEntity> {
  constructor(private readonly layoutRepositoryService: LayoutRepositoryService) {}

  async fetchSyncableResources(environmentId: string, organizationId: string): Promise<LayoutEntity[]> {
    return await this.layoutRepositoryService.fetchSyncableLayouts(environmentId, organizationId);
  }

  createResourceMap(resources: LayoutEntity[]): Map<string, LayoutEntity> {
    return this.layoutRepositoryService.createLayoutMap(resources);
  }

  getResourceIdentifier(resource: LayoutEntity): string {
    return this.layoutRepositoryService.getLayoutIdentifier(resource);
  }
}
