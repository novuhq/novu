import { Injectable, NotFoundException } from '@nestjs/common';
import { AnalyticsService } from '@novu/application-generic';
import { MessageEntity, MessageRepository } from '@novu/dal';

import { ApiException } from '../../../shared/exceptions/api.exception';
import { GetSubscriber } from '../../../subscribers/usecases/get-subscriber';
import { AnalyticsEventsEnum } from '../../utils';
import { mapToDto } from '../../utils/notification-mapper';
import { InboxNotification } from '../../utils/types';
import { MarkManyNotificationsAsCommand } from '../mark-many-notifications-as/mark-many-notifications-as.command';
import { MarkManyNotificationsAs } from '../mark-many-notifications-as/mark-many-notifications-as.usecase';
import { MarkNotificationAsCommand } from './mark-notification-as.command';

@Injectable()
export class MarkNotificationAs {
  constructor(
    private markManyNotificationsAs: MarkManyNotificationsAs,
    private getSubscriber: GetSubscriber,
    private analyticsService: AnalyticsService,
    private messageRepository: MessageRepository
  ) {}

  async execute(command: MarkNotificationAsCommand): Promise<InboxNotification> {
    const subscriber = await this.getSubscriber.execute({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      subscriberId: command.subscriberId,
    });
    if (!subscriber) {
      throw new ApiException(`Subscriber with id: ${command.subscriberId} is not found.`);
    }

    const message = await this.messageRepository.findOne({
      _environmentId: command.environmentId,
      _subscriberId: subscriber._id,
      _id: command.notificationId,
    });
    if (!message) {
      throw new NotFoundException(`Notification with id: ${command.notificationId} is not found.`);
    }

    await this.markManyNotificationsAs.execute(
      MarkManyNotificationsAsCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        subscriberId: command.subscriberId,
        ids: [command.notificationId],
        read: command.read,
        archived: command.archived,
      })
    );

    this.analyticsService.mixpanelTrack(AnalyticsEventsEnum.MARK_NOTIFICATION_AS, '', {
      _organization: command.organizationId,
      _subscriber: subscriber._id,
      _notification: command.notificationId,
      read: command.read,
      archived: command.archived,
    });

    return mapToDto(
      (await this.messageRepository.findOne({
        _environmentId: command.environmentId,
        _id: command.notificationId,
      })) as MessageEntity
    );
  }
}
