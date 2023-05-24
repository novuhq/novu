import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationTemplateRepository, NotificationTemplateEntity } from '@novu/dal';
import { buildGroupedBlueprintsKey, CachedEntity } from '@novu/application-generic';
import { INotificationTemplate, IGroupedBlueprint } from '@novu/shared';

import { GroupedBlueprintResponse } from '../../dto/grouped-blueprint.response.dto';
import { POPULAR_TEMPLATES_GROUPED } from './index';

const WEEK_IN_SECONDS = 60 * 60 * 24 * 7;

@Injectable()
export class GetGroupedBlueprints {
  constructor(private notificationTemplateRepository: NotificationTemplateRepository) {}

  @CachedEntity({
    builder: () => buildGroupedBlueprintsKey(),
    options: { ttl: WEEK_IN_SECONDS },
  })
  async execute(): Promise<GroupedBlueprintResponse> {
    const groups = await this.fetchGroupedBlueprints();

    const updatePopularBlueprints = this.updatePopularBlueprints(groups);

    const popular = { name: POPULAR_TEMPLATES_GROUPED.name, blueprints: updatePopularBlueprints };

    return { general: groups as IGroupedBlueprint[], popular };
  }

  private async fetchGroupedBlueprints() {
    const groups = await this.notificationTemplateRepository.findAllGroupedByCategory();
    if (!groups) {
      throw new NotFoundException(
        `Blueprints for organization id ${NotificationTemplateRepository.getBlueprintOrganizationId()} were not found`
      );
    }

    return groups;
  }

  private extractStoredBlueprints(groups: { name: string; blueprints: NotificationTemplateEntity[] }[]) {
    return groups
      .map((group) => group.blueprints)
      .reduce((acc, curr) => {
        acc.push(...curr);

        return acc;
      });
  }

  private updatePopularBlueprints(
    groups: { name: string; blueprints: NotificationTemplateEntity[] }[]
  ): INotificationTemplate[] {
    const storedBlueprints = this.extractStoredBlueprints(groups);

    const localPopularBlueprints = { ...POPULAR_TEMPLATES_GROUPED };

    return localPopularBlueprints.blueprints.map((localBlueprint) => {
      const storedBlueprint = storedBlueprints.find((blueprint) => blueprint._id === localBlueprint._id);

      return (storedBlueprint ? storedBlueprint : localBlueprint) as INotificationTemplate;
    });
  }
}
