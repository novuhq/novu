import { forwardRef, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PromoteTypeChangeCommand } from '../promote-type-change.command';
import { ApplyChange } from '../apply-change/apply-change.usecase';
import { ChangeRepository } from '@novu/dal';
import {
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  MessageTemplateRepository,
  NotificationStepEntity,
  NotificationGroupRepository,
} from '@novu/dal';
import { ChangeEntityTypeEnum } from '@novu/shared';
import { ApplyChangeCommand } from '../apply-change/apply-change.command';
import { CacheKeyPrefixEnum, InvalidateCacheService } from '../../../shared/services/cache';

@Injectable()
export class PromoteNotificationTemplateChange {
  constructor(
    private invalidateCache: InvalidateCacheService,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private messageTemplateRepository: MessageTemplateRepository,
    private notificationGroupRepository: NotificationGroupRepository,
    @Inject(forwardRef(() => ApplyChange)) private applyChange: ApplyChange,
    private changeRepository: ChangeRepository
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

    const missingMessages: string[] = [];

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

    let notificationGroup = await this.notificationGroupRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _parentId: newItem._notificationGroupId,
    });

    if (!notificationGroup) {
      const changes = await this.changeRepository.getEntityChanges(
        command.organizationId,
        ChangeEntityTypeEnum.NOTIFICATION_GROUP,
        newItem._notificationGroupId
      );

      for (const change of changes) {
        await this.applyChange.execute(
          ApplyChangeCommand.create({
            changeId: change._id,
            environmentId: change._environmentId,
            organizationId: change._organizationId,
            userId: command.userId,
          })
        );
      }
      notificationGroup = await this.notificationGroupRepository.findOne({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _parentId: newItem._notificationGroupId,
      });
    }

    if (!notificationGroup) {
      throw new NotFoundException(
        `Notification Group: ${newItem.name} with the ${newItem._notificationGroupId} Id not found`
      );
    }

    if (!item) {
      return this.notificationTemplateRepository.create({
        name: newItem.name,
        active: newItem.active,
        draft: newItem.draft,
        description: newItem.description,
        tags: newItem.tags,
        critical: newItem.critical,
        triggers: newItem.triggers,
        preferenceSettings: newItem.preferenceSettings,
        steps,
        _parentId: command.item._id,
        _creatorId: command.userId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _notificationGroupId: notificationGroup._id,
        isBlueprint: command.organizationId === this.blueprintOrganizationId,
        blueprintId: newItem.blueprintId,
      });
    }

    const count = await this.notificationTemplateRepository.count({
      _organizationId: command.organizationId,
      _id: command.item._id,
    });

    if (count === 0) {
      await this.notificationTemplateRepository.delete({ _environmentId: command.environmentId, _id: item._id });

      return;
    }

    this.invalidateCache.clearCache({
      storeKeyPrefix: CacheKeyPrefixEnum.NOTIFICATION_TEMPLATE,
      credentials: {
        _id: item._id,
        environmentId: command.environmentId,
      },
    });

    return await this.notificationTemplateRepository.update(
      {
        _environmentId: command.environmentId,
        _id: item._id,
      },
      {
        name: newItem.name,
        active: newItem.active,
        draft: newItem.draft,
        description: newItem.description,
        tags: newItem.tags,
        critical: newItem.critical,
        triggers: newItem.triggers,
        preferenceSettings: newItem.preferenceSettings,
        steps,
        _notificationGroupId: notificationGroup._id,
        isBlueprint: command.organizationId === this.blueprintOrganizationId,
      }
    );
  }

  private get blueprintOrganizationId(): string {
    return NotificationTemplateRepository.getBlueprintOrganizationId();
  }
}
