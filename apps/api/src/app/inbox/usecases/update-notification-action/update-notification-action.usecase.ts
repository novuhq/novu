import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AnalyticsService, buildFeedKey, InvalidateCacheService } from '@novu/application-generic';
import { MessageEntity, MessageRepository } from '@novu/dal';
import { ButtonTypeEnum } from '@novu/shared';

import { GetSubscriber } from '../../../subscribers/usecases/get-subscriber';
import { InboxNotificationDto } from '../../dtos/inbox-notification.dto';
import { AnalyticsEventsEnum } from '../../utils';
import { mapToDto } from '../../utils/notification-mapper';
import type { UpdateNotificationActionCommand } from './update-notification-action.command';

@Injectable()
export class UpdateNotificationAction {
  constructor(
    private invalidateCache: InvalidateCacheService,
    private getSubscriber: GetSubscriber,
    private analyticsService: AnalyticsService,
    private messageRepository: MessageRepository
  ) {}

  async execute(command: UpdateNotificationActionCommand): Promise<InboxNotificationDto> {
    const subscriber = await this.getSubscriber.execute({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      subscriberId: command.subscriberId,
    });
    if (!subscriber) {
      throw new BadRequestException(`Subscriber with id: ${command.subscriberId} is not found.`);
    }

    const message = await this.messageRepository.findOneForInbox({
      _environmentId: command.environmentId,
      _subscriberId: subscriber._id,
      _id: command.notificationId,
      contextKeys: command.contextKeys,
    });
    if (!message) {
      throw new NotFoundException(`Notification with id: ${command.notificationId} is not found.`);
    }

    const isUpdatingPrimaryCta = command.actionType === ButtonTypeEnum.PRIMARY;
    const isUpdatingSecondaryCta = command.actionType === ButtonTypeEnum.SECONDARY;
    const primaryCta = message.cta.action?.buttons?.find((button) => button.type === ButtonTypeEnum.PRIMARY);
    const secondaryCta = message.cta.action?.buttons?.find((button) => button.type === ButtonTypeEnum.SECONDARY);
    if ((isUpdatingPrimaryCta && !primaryCta) || (isUpdatingSecondaryCta && !secondaryCta)) {
      throw new BadRequestException(
        `Could not perform action on the ${
          isUpdatingPrimaryCta && !primaryCta ? 'primary' : 'secondary'
        } button because it does not exist.`
      );
    }

    await this.messageRepository.updateActionStatus({
      environmentId: command.environmentId,
      subscriberId: subscriber._id,
      id: command.notificationId,
      actionType: command.actionType,
      actionStatus: command.actionStatus,
    });

    this.analyticsService.mixpanelTrack(AnalyticsEventsEnum.UPDATE_NOTIFICATION_ACTION, '', {
      _organization: command.organizationId,
      _subscriber: subscriber._id,
      _notification: command.notificationId,
      actionType: command.actionType,
      actionStatus: command.actionStatus,
    });

    return mapToDto(
      (await this.messageRepository.findOneForInbox({
        _environmentId: command.environmentId,
        _id: command.notificationId,
      })) as MessageEntity
    );
  }
}
