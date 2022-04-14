import { Injectable, Logger } from '@nestjs/common';
import { TypeChangeEnabledCommand } from '../type-change-enabled.command';
import { NotificationTemplateEntity, NotificationTemplateRepository, MessageTemplateRepository } from '@novu/dal';

@Injectable()
export class ChangeEnabledNotificationTemplate {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private messageTemplateRepository: MessageTemplateRepository
  ) {}

  async execute(command: TypeChangeEnabledCommand) {
    const item = await this.notificationTemplateRepository.findOne({
      _environmentId: command.environmentId,
      _parentId: command.item._id,
    });

    const newItem = command.item as NotificationTemplateEntity;

    const messages = await this.messageTemplateRepository.find({
      _environmentId: command.environmentId,
      _parentId: {
        $in: newItem.steps ? newItem.steps.map((step) => step._id) : [],
      },
    });

    const missingMessages = [];
    const steps = newItem.steps
      ? newItem.steps
          .map((step) => {
            const oldMessage = messages.reduce((prev, message) => {
              return message._parentId === step._id ? message : prev;
            }, undefined);

            if (!oldMessage) {
              missingMessages.push(step._id);

              return undefined;
            }
            step._id = oldMessage._id;

            return step;
          })
          .filter((step) => step !== undefined)
      : [];

    if (missingMessages.length > 0 && steps.length > 0) {
      Logger.error(
        `Message templates with ids ${missingMessages.join(', ')} are missing for notification template ${item._id}`
      );
    }

    if (!item) {
      return this.notificationTemplateRepository.create({
        name: newItem.name,
        active: newItem.active,
        description: newItem.description,
        tags: newItem.tags,
        triggers: newItem.triggers,
        steps,
      });
    }

    return await this.notificationTemplateRepository.update(
      {
        _id: item._id,
      },
      {
        name: newItem.name,
        active: newItem.active,
        description: newItem.description,
        tags: newItem.tags,
        triggers: newItem.triggers,
        steps,
      }
    );
  }
}
