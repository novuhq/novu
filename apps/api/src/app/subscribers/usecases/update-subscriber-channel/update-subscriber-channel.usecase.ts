import { Injectable } from '@nestjs/common';
import { isEqual } from 'lodash';
import {
  IChannelSettings,
  SubscriberRepository,
  IntegrationRepository,
  SubscriberEntity,
  IntegrationEntity,
} from '@novu/dal';
import { AnalyticsService, buildSubscriberKey, InvalidateCacheService } from '@novu/application-generic';

import { ApiException } from '../../../shared/exceptions/api.exception';
import { UpdateSubscriberChannelCommand } from './update-subscriber-channel.command';

@Injectable()
export class UpdateSubscriberChannel {
  constructor(
    private invalidateCache: InvalidateCacheService,
    private subscriberRepository: SubscriberRepository,
    private integrationRepository: IntegrationRepository,
    private analyticsService: AnalyticsService
  ) {}

  async execute(command: UpdateSubscriberChannelCommand) {
    const foundSubscriber = await this.subscriberRepository.findBySubscriberId(
      command.environmentId,
      command.subscriberId
    );

    if (!foundSubscriber) {
      throw new ApiException(`SubscriberId: ${command.subscriberId} not found`);
    }

    const query: Partial<IntegrationEntity> & { _environmentId: string } = {
      _environmentId: command.environmentId,
      providerId: command.providerId,
      active: true,
    };
    if (command.integrationIdentifier) {
      query.identifier = command.integrationIdentifier;
    }

    const foundIntegration = await this.integrationRepository.findOne(query, undefined, {
      query: { sort: { createdAt: -1 } },
    });

    if (!foundIntegration) {
      throw new ApiException(
        `Subscribers environment (${command.environmentId}) do not have active ${command.providerId} integration.`
      );
    }
    const updatePayload = this.createUpdatePayload(command);

    const existingChannel = foundSubscriber?.channels?.find(
      (subscriberChannel) =>
        subscriberChannel.providerId === command.providerId && subscriberChannel._integrationId === foundIntegration._id
    );

    if (existingChannel) {
      await this.updateExistingSubscriberChannel(
        command.environmentId,
        existingChannel,
        updatePayload,
        foundSubscriber,
        command.isIdempotentOperation
      );
    } else {
      await this.addChannelToSubscriber(updatePayload, foundIntegration, command, foundSubscriber);
    }

    this.analyticsService.mixpanelTrack('Set Subscriber Credentials - [Subscribers]', '', {
      providerId: command.providerId,
      _organization: command.organizationId,
      oauthHandler: command.oauthHandler,
      _subscriberId: foundSubscriber._id,
    });

    return (await this.subscriberRepository.findBySubscriberId(
      command.environmentId,
      command.subscriberId
    )) as SubscriberEntity;
  }

  private async addChannelToSubscriber(
    updatePayload: Partial<IChannelSettings>,
    foundIntegration,
    command: UpdateSubscriberChannelCommand,
    foundSubscriber
  ) {
    updatePayload._integrationId = foundIntegration._id;
    updatePayload.providerId = command.providerId;

    await this.invalidateCache.invalidateByKey({
      key: buildSubscriberKey({
        subscriberId: command.subscriberId,
        _environmentId: command.environmentId,
      }),
    });

    await this.subscriberRepository.update(
      { _environmentId: command.environmentId, _id: foundSubscriber },
      {
        $push: {
          channels: updatePayload,
        },
      }
    );
  }

  private async updateExistingSubscriberChannel(
    environmentId: string,
    existingChannel: IChannelSettings,
    updatePayload: Partial<IChannelSettings>,
    foundSubscriber: SubscriberEntity,
    isIdempotentOperation: boolean
  ) {
    const equal = isEqual(existingChannel.credentials, updatePayload.credentials);

    if (equal) {
      return;
    }

    let deviceTokens: string[] = [];

    if (updatePayload.credentials?.deviceTokens) {
      if (isIdempotentOperation) {
        deviceTokens = this.unionDeviceTokens([], updatePayload.credentials.deviceTokens);
      } else {
        deviceTokens = this.unionDeviceTokens(
          existingChannel.credentials.deviceTokens ?? [],
          updatePayload.credentials.deviceTokens
        );
      }
    }

    await this.invalidateCache.invalidateByKey({
      key: buildSubscriberKey({
        subscriberId: foundSubscriber.subscriberId,
        _environmentId: foundSubscriber._environmentId,
      }),
    });

    const mappedChannel: IChannelSettings = this.mapChannel(updatePayload, existingChannel, deviceTokens);

    await this.subscriberRepository.update(
      {
        _environmentId: environmentId,
        _id: foundSubscriber,
        'channels._integrationId': existingChannel._integrationId,
      },
      { $set: { 'channels.$': mappedChannel } }
    );
  }

  private mapChannel(
    updatePayload: Partial<IChannelSettings>,
    existingChannel: IChannelSettings,
    deviceTokens: string[]
  ): IChannelSettings {
    return {
      _integrationId: updatePayload._integrationId || existingChannel._integrationId,
      providerId: updatePayload.providerId || existingChannel.providerId,
      credentials: { ...existingChannel.credentials, ...updatePayload.credentials, deviceTokens },
    };
  }

  private unionDeviceTokens(existingDeviceTokens: string[], updateDeviceTokens: string[]): string[] {
    // in order to not have breaking change we will support [] update
    if (updateDeviceTokens?.length === 0) return [];

    return [...new Set([...existingDeviceTokens, ...updateDeviceTokens])];
  }

  private createUpdatePayload(command: UpdateSubscriberChannelCommand) {
    const updatePayload: Partial<IChannelSettings> = {
      credentials: {},
    };

    if (command.credentials != null) {
      if (command.credentials.webhookUrl != null && updatePayload.credentials) {
        updatePayload.credentials.webhookUrl = command.credentials.webhookUrl;
      }
      if (command.credentials.deviceTokens != null && updatePayload.credentials) {
        updatePayload.credentials.deviceTokens = [...new Set([...command.credentials.deviceTokens])];
      }
      if (command.credentials.channel != null && updatePayload.credentials) {
        updatePayload.credentials.channel = command.credentials.channel;
      }
    }

    return updatePayload;
  }
}
