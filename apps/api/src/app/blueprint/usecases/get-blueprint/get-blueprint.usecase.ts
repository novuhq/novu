import { Injectable, NotFoundException } from '@nestjs/common';

import { NotificationTemplateEntity, NotificationTemplateRepository } from '@novu/dal';
import { GetBlueprintResponse } from '../../dtos/get-blueprint.response.dto';
import { GetBlueprintCommand } from './get-blueprint.command';

@Injectable()
export class GetBlueprint {
  constructor(private notificationTemplateRepository: NotificationTemplateRepository) {}

  async execute(command: GetBlueprintCommand): Promise<GetBlueprintResponse> {
    const isInternalId = NotificationTemplateRepository.isInternalId(command.templateIdOrIdentifier);

    let template: NotificationTemplateEntity | null;

    if (isInternalId) {
      template = await this.notificationTemplateRepository.findBlueprintById(command.templateIdOrIdentifier);
    } else {
      template = await this.notificationTemplateRepository.findBlueprintByTriggerIdentifier(
        command.templateIdOrIdentifier
      );
    }

    if (!template) {
      throw new NotFoundException(`Blueprint with id ${command.templateIdOrIdentifier} not found`);
    }

    return template as GetBlueprintResponse;
  }
}
