import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationTemplateEntity, NotificationTemplateRepository, ChangeRepository } from '@novu/dal';
import { ChangeEntityTypeEnum } from '@novu/shared';
import {
  buildNotificationTemplateIdentifierKey,
  buildNotificationTemplateKey,
  CreateChange,
  CreateChangeCommand,
  InvalidateCacheService,
} from '@novu/application-generic';

import { ChangeTemplateActiveStatusCommand } from './change-template-active-status.command';

/**
 * DEPRECATED:
 * This usecase is deprecated and will be removed in the future.
 * Please use the ChangeWorkflowActiveStatus usecase instead.
 */
@Injectable()
export class ChangeTemplateActiveStatus {
  constructor(
    private invalidateCache: InvalidateCacheService,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private createChange: CreateChange,
    private changeRepository: ChangeRepository
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

    await this.invalidateCache.invalidateByKey({
      key: buildNotificationTemplateKey({
        _id: command.templateId,
        _environmentId: command.environmentId,
      }),
    });

    await this.invalidateCache.invalidateByKey({
      key: buildNotificationTemplateIdentifierKey({
        templateIdentifier: foundTemplate.triggers[0].identifier,
        _environmentId: command.environmentId,
      }),
    });

    await this.notificationTemplateRepository.update(
      {
        _id: command.templateId,
        _environmentId: command.environmentId,
      },
      {
        $set: {
          active: command.active,
          draft: !command.active,
        },
      }
    );

    const item = await this.notificationTemplateRepository.findById(command.templateId, command.environmentId);
    if (!item) throw new NotFoundException(`Notification template ${command.templateId} is not found`);

    const parentChangeId: string = await this.changeRepository.getChangeId(
      command.environmentId,
      ChangeEntityTypeEnum.NOTIFICATION_TEMPLATE,
      command.templateId
    );

    await this.createChange.execute(
      CreateChangeCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        userId: command.userId,
        type: ChangeEntityTypeEnum.NOTIFICATION_TEMPLATE,
        item,
        changeId: parentChangeId,
      })
    );

    return item;
  }
}
