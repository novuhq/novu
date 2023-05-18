import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationTemplateRepository } from '@novu/dal';

import { GroupedBlueprintResponse } from '../../dto/grouped-blueprint.response.dto';
import { buildGroupedBlueprintsKey, CachedEntity } from '@novu/application-generic';

const WEEK_IN_SECONDS = 60 * 60 * 24 * 7;

@Injectable()
export class GetGroupedBlueprints {
  constructor(private notificationTemplateRepository: NotificationTemplateRepository) {}

  @CachedEntity({
    builder: () => buildGroupedBlueprintsKey({ identifier: 'blueprints/group-by-category' }),
    options: { ttl: WEEK_IN_SECONDS },
  })
  async execute(): Promise<GroupedBlueprintResponse[]> {
    const blueprints = await this.notificationTemplateRepository.findAllGroupedByCategory();
    if (!blueprints) {
      throw new NotFoundException(
        `Blueprints for organization id ${NotificationTemplateRepository.getBlueprintOrganizationId()} were not found`
      );
    }

    return blueprints;
  }
}
