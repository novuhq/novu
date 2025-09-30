import { SubscriberEntity } from '@novu/dal';
import { IChannelCredentials, IChannelSettings } from '@novu/shared';
import { ChannelCredentials } from '../../shared/dtos/subscriber-channel';
import { ChannelSettingsDto, SubscriberResponseDto } from '../../subscribers/dtos';

export function mapSubscriberEntityToResponseDto(entity: SubscriberEntity): SubscriberResponseDto {
  return {
    _id: entity._id,
    firstName: entity.firstName,
    lastName: entity.lastName,
    email: entity.email ?? null,
    phone: entity.phone,
    avatar: entity.avatar,
    subscriberId: entity.subscriberId,
    channels: entity.channels?.map(mapChannelSettings),
    topics: entity.topics,
    isOnline: entity.isOnline,
    lastOnlineAt: entity.lastOnlineAt,
    _organizationId: entity._organizationId,
    _environmentId: entity._environmentId,
    deleted: entity.deleted,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    __v: entity.__v,
    data: entity.data,
    locale: entity.locale,
    timezone: entity.timezone,
  };
}

function mapChannelSettings(settings: IChannelSettings): ChannelSettingsDto {
  return {
    _integrationId: settings._integrationId,
    providerId: settings.providerId,
    credentials: mapChannelCredentials(settings.credentials),
  };
}
function mapChannelCredentials(input: IChannelCredentials): ChannelCredentials {
  return {
    webhookUrl: input.webhookUrl,
    channel: input.channel,
    deviceTokens: input.deviceTokens,
    // Additional fields not in original IChannelCredentials are left undefined
    alertUid: undefined,
    title: undefined,
    imageUrl: undefined,
    state: undefined,
    externalUrl: undefined,
  };
}
