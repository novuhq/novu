import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationTemplateRepository } from '@novu/dal';

import { GroupedBlueprintResponse } from '../../dto/grouped-blueprint.response.dto';

@Injectable()
export class GetGroupedBlueprints {
  constructor(private notificationTemplateRepository: NotificationTemplateRepository) {}

  async execute(): Promise<GroupedBlueprintResponse[]> {
    const blueprints = await this.notificationTemplateRepository.findAllGroupedByCategory();
    if (!blueprints) {
      throw new NotFoundException(
        `Blueprints for environment id ${NotificationTemplateRepository.getBlueprintEnvironmentId()} were not found`
      );
    }

    return blueprints;
  }
}
