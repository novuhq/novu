import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationGroupRepository, NotificationTemplateEntity, NotificationTemplateRepository } from '@novu/dal';
import { CreateNotificationTemplate, CreateNotificationTemplateCommand } from '../create-notification-template';
import { CreateBlueprintNotificationTemplateCommand } from './create-blueprint-notification-template.command';

@Injectable()
export class CreateBlueprintNotificationTemplate {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private createNotificationTemplateUsecase: CreateNotificationTemplate,
    private notificationGroupRepository: NotificationGroupRepository
  ) {}

  async execute(command: CreateBlueprintNotificationTemplateCommand): Promise<NotificationTemplateEntity> {
    const template = await this.notificationTemplateRepository.findBlueprint(command.templateId);
    if (!template) {
      throw new NotFoundException(`Template with id ${command.templateId} not found`);
    }

    const group = await this.notificationGroupRepository.findOne({
      name: 'General',
      _organizationId: command.organizationId,
    });

    if (!group) {
      throw new NotFoundException(`Notification group with name General not found`);
    }

    return this.createNotificationTemplateUsecase.execute(
      CreateNotificationTemplateCommand.create({
        organizationId: command.organizationId,
        userId: command.userId,
        environmentId: command.environmentId,
        name: template.name,
        tags: template.tags,
        description: template.description,
        steps: template.steps,
        notificationGroupId: group._id,
        active: template.active ?? false,
        draft: template.draft ?? true,
        critical: template.critical ?? false,
        preferenceSettings: template.preferenceSettings,
        blueprintId: command.templateId,
      })
    );
  }
}
