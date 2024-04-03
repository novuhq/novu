import { Injectable, NotFoundException } from '@nestjs/common';

import { NotificationTemplateRepository, NotificationTemplateEntity } from '@novu/dal';

import { GetBlueprintCommand } from './get-blueprint.command';
import { GetBlueprintResponse } from '../../dto/get-blueprint.response.dto';

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
