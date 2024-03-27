import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  MessageEntity,
  MessageRepository,
  MessageTemplateEntity,
  SubscriberRepository,
  MemberRepository,
} from '@novu/dal';
import { AnalyticsService } from '@novu/application-generic';

import { UpdateMessageActionsCommand } from './update-message-actions.command';

import { ApiException } from '../../../shared/exceptions/api.exception';

@Injectable()
export class UpdateMessageActions {
  constructor(
    private messageRepository: MessageRepository,
    private subscriberRepository: SubscriberRepository,
    private analyticsService: AnalyticsService,
    private memberRepository: MemberRepository
  ) {}

  async execute(command: UpdateMessageActionsCommand): Promise<MessageEntity> {
    const foundMessage = await this.messageRepository.findOne({
      _environmentId: command.environmentId,
      _id: command.messageId,
    });
    if (!foundMessage) {
      throw new NotFoundException(`Message ${command.messageId} not found`);
    }

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

    const organizationAdmin = await this.memberRepository.getOrganizationAdminAccount(command.organizationId);
    if (organizationAdmin) {
      this.analyticsService.track('Notification Action Clicked - [Notification Center]', organizationAdmin?._userId, {
        _subscriber: subscriber._id,
        _organization: command.organizationId,
        _environment: command.environmentId,
      });
    }

    return (await this.messageRepository.findOne({
      _environmentId: command.environmentId,
      _id: command.messageId,
    })) as MessageEntity;
  }
}
