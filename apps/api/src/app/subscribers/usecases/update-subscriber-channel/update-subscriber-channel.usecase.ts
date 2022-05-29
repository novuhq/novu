import { Injectable } from '@nestjs/common';
import { IChannelSettings, SubscriberRepository, IntegrationRepository } from '@novu/dal';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { UpdateSubscriberChannelCommand } from './update-subscriber-channel.command';

@Injectable()
export class UpdateSubscriberChannel {
  constructor(
    private subscriberRepository: SubscriberRepository,
    private integrationRepository: IntegrationRepository
  ) {}

  async execute(command: UpdateSubscriberChannelCommand) {
    const foundSubscriber = await this.subscriberRepository.findBySubscriberId(
      command.environmentId,
      command.subscriberId
    );

    if (!foundSubscriber) {
      throw new ApiException(`SubscriberId: ${command.subscriberId} not found`);
    }

    const foundIntegration = await this.integrationRepository.findOne({
      _environmentId: command.environmentId,
      providerId: command.providerId,
      active: true,
    });

    if (!foundIntegration) {
      throw new ApiException(
        `Subscribers environment (${command.environmentId}) do not have active ${command.providerId} integration.`
      );
    }

    const updatePayload: Partial<IChannelSettings> = {};

    if (command.credentials != null) {
      if (command.credentials.channelId != null) {
        updatePayload[`credentials.channelId`] = command.credentials.channelId;
      }

      if (command.credentials.accessToken != null) {
        updatePayload[`credentials.accessToken`] = command.credentials.accessToken;
      }
    }

    const existingChannel = foundSubscriber?.channels?.find(
      (subscriberChannel) => subscriberChannel.providerId === command.providerId
    );

    if (existingChannel) {
      const mergedChannel = Object.assign(existingChannel, updatePayload);

      await this.subscriberRepository.update(
        { _id: foundSubscriber, 'channels._integrationId': existingChannel._integrationId },
        { $set: { 'channels.$': mergedChannel } }
      );
    } else {
      updatePayload._integrationId = foundIntegration._id;
      updatePayload.providerId = command.providerId;

      await this.subscriberRepository.update(
        { _id: foundSubscriber },
        {
          $push: {
            channels: updatePayload,
          },
        }
      );
    }

    return await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);
  }
}
