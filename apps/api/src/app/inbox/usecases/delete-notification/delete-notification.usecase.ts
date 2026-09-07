import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AnalyticsService } from '@novu/application-generic';
import { MessageRepository } from '@novu/dal';

import { GetSubscriber } from '../../../subscribers/usecases/get-subscriber';
import { AnalyticsEventsEnum } from '../../utils';
import { DeleteManyNotificationsCommand } from '../delete-many-notifications/delete-many-notifications.command';
import { DeleteManyNotifications } from '../delete-many-notifications/delete-many-notifications.usecase';
import { DeleteNotificationCommand } from './delete-notification.command';

@Injectable()
export class DeleteNotification {
  constructor(
    private deleteManyNotifications: DeleteManyNotifications,
    private getSubscriber: GetSubscriber,
    private analyticsService: AnalyticsService,
    private messageRepository: MessageRepository
  ) {}

  async execute(command: DeleteNotificationCommand): Promise<void> {
    const subscriber = await this.getSubscriber.execute({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      subscriberId: command.subscriberId,
    });
    if (!subscriber) {
      throw new BadRequestException(`Subscriber with id: ${command.subscriberId} is not found.`);
    }

    const message = await this.messageRepository.findOne({
      _environmentId: command.environmentId,
      _subscriberId: subscriber._id,
      _id: command.notificationId,
      contextKeys: command.contextKeys,
    });
    if (!message) {
      throw new NotFoundException(`Notification with id: ${command.notificationId} is not found.`);
    }

    await this.deleteManyNotifications.execute(
      DeleteManyNotificationsCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        subscriberId: command.subscriberId,
        ids: [command.notificationId],
        contextKeys: command.contextKeys,
      })
    );

    this.analyticsService.mixpanelTrack(AnalyticsEventsEnum.DELETE_NOTIFICATION, '', {
      _organization: command.organizationId,
      _subscriber: subscriber._id,
      _notification: command.notificationId,
    });
  }
}
