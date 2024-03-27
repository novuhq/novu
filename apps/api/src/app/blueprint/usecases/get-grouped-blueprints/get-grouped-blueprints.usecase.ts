import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationTemplateRepository, NotificationTemplateEntity } from '@novu/dal';
import { buildGroupedBlueprintsKey, CachedEntity } from '@novu/application-generic';
import { IGroupedBlueprint } from '@novu/shared';

import { GroupedBlueprintResponse } from '../../dto/grouped-blueprint.response.dto';
import { GetGroupedBlueprintsCommand, POPULAR_GROUPED_NAME, POPULAR_TEMPLATES_ID_LIST } from './index';

const WEEK_IN_SECONDS = 60 * 60 * 24 * 7;

@Injectable()
export class GetGroupedBlueprints {
  constructor(private notificationTemplateRepository: NotificationTemplateRepository) {}

  @CachedEntity({
    builder: (command: GetGroupedBlueprintsCommand) => buildGroupedBlueprintsKey(command.environmentId),
    options: { ttl: WEEK_IN_SECONDS },
  })
  async execute(command: GetGroupedBlueprintsCommand): Promise<GroupedBlueprintResponse> {
    const generalGroups = await this.fetchGroupedBlueprints();

    const updatePopularBlueprints = this.getPopularGroupBlueprints(generalGroups);

    const popularGroup = { name: POPULAR_GROUPED_NAME, blueprints: updatePopularBlueprints };

    return { general: generalGroups as IGroupedBlueprint[], popular: popularGroup as IGroupedBlueprint };
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

  private getPopularGroupBlueprints(
    groups: { name: string; blueprints: NotificationTemplateEntity[] }[]
  ): NotificationTemplateEntity[] {
    const storedBlueprints = this.groupedToBlueprintsArray(groups);

    const localPopularIds = [...POPULAR_TEMPLATES_ID_LIST];

    const result: NotificationTemplateEntity[] = [];

    for (const localPopularId of localPopularIds) {
      const storedBlueprint = storedBlueprints.find((blueprint) => blueprint._id === localPopularId);

      if (!storedBlueprint) {
        Logger.warn(
          `Could not find stored popular blueprint id: ${localPopularId}, BLUEPRINT_CREATOR: 
          ${NotificationTemplateRepository.getBlueprintOrganizationId()}`
        );

        continue;
      }

      result.push(storedBlueprint);
    }

    return result;
  }
}
