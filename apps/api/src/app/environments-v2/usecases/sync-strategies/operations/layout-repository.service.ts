import { Injectable } from '@nestjs/common';
import { LayoutEntity, LayoutRepository } from '@novu/dal';

@Injectable()
export class LayoutRepositoryService {
  constructor(private layoutRepository: LayoutRepository) {}

  async fetchSyncableLayouts(environmentId: string, organizationId: string): Promise<LayoutEntity[]> {
    return await this.layoutRepository.findPublishable(environmentId, organizationId);
  }

  getLayoutIdentifier(layout: LayoutEntity): string {
    return layout.identifier;
  }

  createLayoutMap(layouts: LayoutEntity[]): Map<string, LayoutEntity> {
    return new Map(layouts.map((layout) => [this.getLayoutIdentifier(layout), layout]));
  }
}
