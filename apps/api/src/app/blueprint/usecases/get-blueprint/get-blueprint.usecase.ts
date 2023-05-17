import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationTemplateEntity, NotificationTemplateRepository } from '@novu/dal';
import { GetBlueprintCommand } from './get-blueprint.command';

@Injectable()
export class GetBlueprint {
  constructor(private notificationTemplateRepository: NotificationTemplateRepository) {}

  async execute(command: GetBlueprintCommand): Promise<NotificationTemplateEntity> {
    const template = await this.notificationTemplateRepository.findBlueprint(command.templateId);
    if (!template) {
      throw new NotFoundException(`Template with id ${command.templateId} not found`);
    }

    return template;
  }
}
