import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationTemplateRepository, NotificationTemplateEntity } from '@novu/dal';
import { buildGroupedBlueprintsKey, CachedEntity } from '@novu/application-generic';
import { INotificationTemplate, IGroupedBlueprint } from '@novu/shared';

import { GroupedBlueprintResponse } from '../../dto/grouped-blueprint.response.dto';
import { POPULAR_GROUPED_NAME, POPULAR_TEMPLATES_ID_LIST } from './index';

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

    const popular = { name: POPULAR_GROUPED_NAME, blueprints: updatePopularBlueprints };

    return { general: groups as IGroupedBlueprint[], popular };
  }

  private async fetchGroupedBlueprints() {
    const groups = await this.notificationTemplateRepository.findAllGroupedByCategory();
    if (!groups?.length) {
      throw new NotFoundException(
        `Blueprints for organization id ${NotificationTemplateRepository.getBlueprintOrganizationId()} were not found`
      );
    }

    return groups;
  }

  private groupedToBlueprintsArray(groups: { name: string; blueprints: NotificationTemplateEntity[] }[]) {
    return groups.map((group) => group.blueprints).flat();
  }

  private updatePopularBlueprints(
    groups: { name: string; blueprints: NotificationTemplateEntity[] }[]
  ): INotificationTemplate[] {
    const storedBlueprints = this.groupedToBlueprintsArray(groups);

    const localPopularIds = [...POPULAR_TEMPLATES_ID_LIST];

    const result: INotificationTemplate[] = [];

    for (const localPopularId of localPopularIds) {
      const storedBlueprint = storedBlueprints.find((blueprint) => blueprint._id === localPopularId);

      if (!storedBlueprint) {
        Logger.warn(
          `Could not find stored popular blueprint id: ${localPopularId}, BLUEPRINT_CREATOR: ${NotificationTemplateRepository.getBlueprintOrganizationId()}`
        );

        continue;
      }

      result.push(storedBlueprint as INotificationTemplate);
    }

    return result;
  }
}
