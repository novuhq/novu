import { Inject, Injectable } from '@nestjs/common';
import { MessageEntity, MessageRepository, MessageTemplateEntity, SubscriberRepository } from '@novu/dal';
import { UpdateMessageActionsCommand } from './update-message-actions.command';
import { AnalyticsService } from '../../../shared/services/analytics/analytics.service';
import { ANALYTICS_SERVICE } from '../../../shared/shared.module';
import { ApiException } from '../../../shared/exceptions/api.exception';

@Injectable()
export class UpdateMessageActions {
  constructor(
    private messageRepository: MessageRepository,
    private subscriberRepository: SubscriberRepository,
    @Inject(ANALYTICS_SERVICE) private analyticsService: AnalyticsService
  ) {}

  async execute(command: UpdateMessageActionsCommand): Promise<MessageEntity> {
    const updatePayload: Partial<MessageTemplateEntity> = {};

    if (command.type) {
      updatePayload['cta.action.result.type'] = command.type;
    }

    if (command.status) {
      updatePayload['cta.action.status'] = command.status;
    }

    if (command.payload) {
      updatePayload['cta.action.result.payload'] = command.payload;
    }

    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);

    if (!subscriber) {
      throw new ApiException(
        'Subscriber with the id: ' +
          command.subscriberId +
          ' was not found for this environment. ' +
          'Make sure to create a subscriber before trying to modify it.'
      );
    }

    const modificationResponse = await this.messageRepository.update(
      {
        _environmentId: command.environmentId,
        _subscriberId: subscriber._id,
        _id: command.messageId,
      },
      {
        $set: updatePayload,
      }
    );

    if (!modificationResponse.modified) {
      throw new ApiException(
        'Message with the id: ' +
          command.messageId +
          ' was not found for this environment. ' +
          'Make sure to address correct message before trying to modify it.'
      );
    }

    this.analyticsService.track('Notification Action Clicked - [Notification Center]', command.organizationId, {
      _subscriber: subscriber._id,
      _organization: command.organizationId,
      _environment: command.environmentId,
    });

    return await this.messageRepository.findById(command.messageId);
  }
}
