import { Inject, Injectable } from '@nestjs/common';
import {
  MessageEntity,
  MessageRepository,
  MessageTemplateEntity,
  SubscriberRepository,
  OrganizationRepository,
} from '@novu/dal';
import { UpdateMessageActionsCommand } from './update-message-actions.command';
import { AnalyticsService } from '../../../shared/services/analytics/analytics.service';
import { ANALYTICS_SERVICE } from '../../../shared/shared.module';

@Injectable()
export class UpdateMessageActions {
  constructor(
    private messageRepository: MessageRepository,
    private subscriberRepository: SubscriberRepository,
    @Inject(ANALYTICS_SERVICE) private analyticsService: AnalyticsService,
    private organizationRepository: OrganizationRepository
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

    await this.messageRepository.update(
      {
        _subscriberId: subscriber._id,
        _id: command.messageId,
      },
      {
        $set: updatePayload,
      }
    );

    this.analyticsService.track('Notification Action Clicked - [Notification Center]', command.organizationId, {
      _subscriber: subscriber._id,
      _organization: command.organizationId,
      _environment: command.environmentId,
    });

    return await this.messageRepository.findById(command.messageId);
  }
}
