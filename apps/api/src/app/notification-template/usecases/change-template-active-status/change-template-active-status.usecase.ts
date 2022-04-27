import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ChangeEntityTypeEnum, NotificationTemplateEntity, NotificationTemplateRepository } from '@novu/dal';
import { ChangeTemplateActiveStatusCommand } from './change-template-active-status.command';
import { CreateChangeCommand } from '../../../change/usecases/create-change.command';
import { CreateChange } from '../../../change/usecases/create-change.usecase';
import { mongo } from 'mongoose';

@Injectable()
export class ChangeTemplateActiveStatus {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private createChange: CreateChange
  ) {}

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

    const item = await this.notificationTemplateRepository.findById(command.templateId, command.organizationId);
    await this.createChange.execute(
      CreateChangeCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        userId: command.userId,
        type: ChangeEntityTypeEnum.NOTIFICATION_TEMPLATE,
        item,
        changeId: new mongo.ObjectID().toString(),
      })
    );

    return item;
  }
}
