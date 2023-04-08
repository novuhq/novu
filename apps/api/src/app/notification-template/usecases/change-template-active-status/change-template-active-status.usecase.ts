import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationTemplateEntity, NotificationTemplateRepository } from '@novu/dal';
import { ChangeEntityTypeEnum } from '@novu/shared';

import { ChangeTemplateActiveStatusCommand } from './change-template-active-status.command';
import { CreateChange, CreateChangeCommand } from '../../../change/usecases';
import { CacheKeyPrefixEnum, InvalidateCacheService } from '../../../shared/services/cache';

@Injectable()
export class ChangeTemplateActiveStatus {
  constructor(
    private invalidateCache: InvalidateCacheService,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private createChange: CreateChange
  ) {}

  async execute(command: ChangeTemplateActiveStatusCommand): Promise<NotificationTemplateEntity> {
    const foundTemplate = await this.notificationTemplateRepository.findOne({
      _environmentId: command.environmentId,
      _id: command.templateId,
    });

    if (!foundTemplate) {
      throw new NotFoundException(`Template with id ${command.templateId} not found`);
    }

    if (foundTemplate.active === command.active) {
      throw new BadRequestException('You must provide a different status from the current status');
    }

    this.invalidateCache.clearCache({
      storeKeyPrefix: [CacheKeyPrefixEnum.NOTIFICATION_TEMPLATE],
      credentials: {
        _id: command.templateId,
        environmentId: command.environmentId,
      },
    });

    await this.notificationTemplateRepository.update(
      {
        _id: command.templateId,
        _environmentId: command.environmentId,
      },
      {
        $set: {
          active: command.active,
          draft: command.active === false,
        },
      }
    );

    const item = await this.notificationTemplateRepository.findById(command.templateId, command.environmentId);
    if (!item) throw new NotFoundException(`Notification template ${command.templateId} is not found`);

    await this.createChange.execute(
      CreateChangeCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        userId: command.userId,
        type: ChangeEntityTypeEnum.NOTIFICATION_TEMPLATE,
        item,
        changeId: NotificationTemplateRepository.createObjectId(),
      })
    );

    return item;
  }
}
