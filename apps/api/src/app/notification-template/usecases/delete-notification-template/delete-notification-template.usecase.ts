// eslint-ignore max-len

import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationTemplateRepository, DalException, ChangeRepository, NotificationTemplateEntity } from '@novu/dal';
import { ChangeEntityTypeEnum } from '@novu/shared';
import { CreateChange, CreateChangeCommand } from '../../../change/usecases';
import { ApiException } from '../../../shared/exceptions/api.exception';

import { GetNotificationTemplateCommand } from '../get-notification-template/get-notification-template.command';
import {
  buildNotificationTemplateIdentifierKey,
  buildNotificationTemplateKey,
  InvalidateCacheService,
} from '@novu/application-generic';
import { DeleteMessageTemplate } from '../../../message-template/usecases/delete-message-template/delete-message-template.usecase';
import { DeleteMessageTemplateCommand } from '../../../message-template/usecases/delete-message-template/delete-message-template.command';

@Injectable()
export class DeleteNotificationTemplate {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private createChange: CreateChange,
    private changeRepository: ChangeRepository,
    private invalidateCache: InvalidateCacheService,
    private deleteMessageTemplate: DeleteMessageTemplate
  ) {}

  async execute(command: GetNotificationTemplateCommand) {
    try {
      await this.notificationTemplateRepository.delete({
        _environmentId: command.environmentId,
        _id: command.templateId,
      });
      const item: NotificationTemplateEntity = (
        await this.notificationTemplateRepository.findDeleted({
          _environmentId: command.environmentId,
          _id: command.templateId,
        })
      )?.[0];

      await this.invalidateCache.invalidateByKey({
        key: buildNotificationTemplateKey({
          _id: item._id,
          _environmentId: command.environmentId,
        }),
      });

      await this.invalidateCache.invalidateByKey({
        key: buildNotificationTemplateIdentifierKey({
          templateIdentifier: item.triggers[0].identifier,
          _environmentId: command.environmentId,
        }),
      });

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
          item: item,
          type: ChangeEntityTypeEnum.NOTIFICATION_TEMPLATE,
          changeId: parentChangeId,
        })
      );

      for (const step of item.steps) {
        await this.deleteMessageTemplate.execute(
          DeleteMessageTemplateCommand.create({
            organizationId: command.organizationId,
            environmentId: command.environmentId,
            userId: command.userId,
            messageTemplateId: step._templateId,
            parentChangeId: parentChangeId,
          })
        );
      }
    } catch (e) {
      if (e instanceof DalException) {
        throw new ApiException(e.message);
      }
      throw e;
    }

    return true;
  }
}
