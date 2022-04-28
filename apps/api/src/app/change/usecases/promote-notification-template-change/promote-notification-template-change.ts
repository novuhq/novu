import { Injectable, Logger } from '@nestjs/common';
import { PromoteTypeChangeCommand } from '../promote-type-change.command';
import { NotificationGroupRepository } from '../../../../../../../libs/dal/src/repositories/notification-group/notification-group.repository';
import {
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  MessageTemplateRepository,
  NotificationStepEntity,
} from '@novu/dal';

@Injectable()
export class PromoteNotificationTemplateChange {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private messageTemplateRepository: MessageTemplateRepository,
    private notificationGroupRepository: NotificationGroupRepository
  ) {}

  async execute(command: PromoteTypeChangeCommand) {
    const item = await this.notificationTemplateRepository.findOne({
      _environmentId: command.environmentId,
      _parentId: command.item._id,
    });

    const newItem = command.item as NotificationTemplateEntity;

    const messages = await this.messageTemplateRepository.find({
      _environmentId: command.environmentId,
      _parentId: {
        $in: newItem.steps ? newItem.steps.map((step) => step._templateId) : [],
      },
    });

    const missingMessages = [];

    const mapNewStepItem = (step: NotificationStepEntity) => {
      const oldMessage = messages.find((message) => {
        return message._parentId === step._templateId;
      });

      if (!oldMessage) {
        missingMessages.push(step._templateId);

        return undefined;
      }
      step._templateId = oldMessage._id;

      return step;
    };

    const steps = newItem.steps ? newItem.steps.map(mapNewStepItem).filter((step) => step !== undefined) : [];

    if (missingMessages.length > 0 && steps.length > 0 && item) {
      Logger.error(
        `Message templates with ids ${missingMessages.join(', ')} are missing for notification template ${item._id}`
      );
    }

    const notificationGroup = await this.notificationGroupRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _parentId: newItem._notificationGroupId,
    });

    if (!notificationGroup) {
      throw new Error(
        `Notification group for environment ${command.environmentId} and organization ${command.organizationId} does not exists`
      );
    }

    if (!item) {
      return this.notificationTemplateRepository.create({
        name: newItem.name,
        active: newItem.active,
        draft: newItem.draft,
        description: newItem.description,
        tags: newItem.tags,
        triggers: newItem.triggers,
        steps,
        _parentId: command.item._id,
        _creatorId: command.userId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _notificationGroupId: notificationGroup._id,
      });
    }

    return await this.notificationTemplateRepository.update(
      {
        _id: item._id,
      },
      {
        name: newItem.name,
        active: newItem.active,
        draft: newItem.draft,
        description: newItem.description,
        tags: newItem.tags,
        triggers: newItem.triggers,
        steps,
        _notificationGroupId: notificationGroup._id,
      }
    );
  }
}
