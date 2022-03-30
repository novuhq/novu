import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationTemplateEntity, NotificationTemplateRepository } from '@novu/dal';
import { ChangeTemplateActiveStatusCommand } from './change-template-active-status.command';

@Injectable()
export class ChangeTemplateActiveStatus {
  constructor(private notificationTemplateRepository: NotificationTemplateRepository) {}

  async execute(command: ChangeTemplateActiveStatusCommand): Promise<NotificationTemplateEntity> {
    const foundTemplate = await this.notificationTemplateRepository.findOne({
      _organizationId: command.organizationId,
      _id: command.templateId,
    });
    if (!foundTemplate) {
      throw new NotFoundException(`Template with id ${command.templateId} not found`);
    }

    if (foundTemplate.active === command.active) {
      throw new BadRequestException('You must provide a different status from the current status');
    }

    await this.notificationTemplateRepository.update(
      {
        _id: command.templateId,
      },
      {
        $set: {
          active: command.active,
          draft: command.active === false,
        },
      }
    );

    return await this.notificationTemplateRepository.findById(command.templateId, command.organizationId);
  }
}
