import { Injectable, NotFoundException } from '@nestjs/common';

import { NotificationTemplateRepository } from '@novu/dal';

import { GetBlueprintCommand } from './get-blueprint.command';
import { GetBlueprintResponse } from '../../dto/get-blueprint.response.dto';

@Injectable()
export class GetBlueprint {
  constructor(private notificationTemplateRepository: NotificationTemplateRepository) {}

  async execute(command: GetBlueprintCommand): Promise<GetBlueprintResponse> {
    const template = await this.notificationTemplateRepository.findBlueprint(command.templateId);
    if (!template) {
      throw new NotFoundException(`Template with id ${command.templateId} not found`);
    }

    return template as GetBlueprintResponse;
  }
}
