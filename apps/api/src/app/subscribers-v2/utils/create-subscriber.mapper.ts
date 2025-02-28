import { SubscriberCustomData, UserSessionData } from '@novu/shared';
import { CreateOrUpdateSubscriberCommand } from '@novu/application-generic';
import { IChannelCredentials, IChannelSettings, SubscriberEntity } from '@novu/dal';
import { CreateSubscriberRequestDto } from '../dtos/create-subscriber.dto';
import { ChannelSettingsDto, SubscriberResponseDto } from '../../subscribers/dtos';
import { ChannelCredentials } from '../../shared/dtos/subscriber-channel';

export function mapSubscriberRequestToCommand(
  dto: CreateSubscriberRequestDto,
  user: UserSessionData
): CreateOrUpdateSubscriberCommand {
  return {
    organizationId: user.organizationId,
    environmentId: user.environmentId,
    subscriberId: dto.subscriberId,
    email: dto.email ?? undefined,
    firstName: dto.firstName ?? undefined,
    lastName: dto.lastName ?? undefined,
    phone: dto.phone ?? undefined,
    avatar: dto.avatar ?? undefined,
    locale: dto.locale ?? undefined,
    data: dto.data ? mapCustomData(dto.data) : undefined,
    timezone: dto.timezone,
    isUpsert: false,
  };
}

function isAllowedType(value: unknown): value is string | number | boolean | string[] | undefined {
  return (
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    (Array.isArray(value) && value.every((item) => typeof item === 'string'))
  );
}

function mapCustomData(data: Record<string, unknown>): SubscriberCustomData {
  return Object.entries(data).reduce((acc, [key, value]) => {
    if (isAllowedType(value)) {
      acc[key] = value;
    }

    return acc;
  }, {} as SubscriberCustomData);
}

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
