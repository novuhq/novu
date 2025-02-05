import { SubscriberEntity } from '@novu/dal';
import { SubscriberResponseDto } from '../../../subscribers/dtos';

export function mapSubscriberEntityToDto(subscriber: SubscriberEntity): SubscriberResponseDto {
  return {
    _id: subscriber._id,
    firstName: subscriber.firstName,
    lastName: subscriber.lastName,
    email: subscriber.email,
    phone: subscriber.phone,
    subscriberId: subscriber.subscriberId,
    createdAt: subscriber.createdAt,
    updatedAt: subscriber.updatedAt,
    _environmentId: subscriber._environmentId,
    _organizationId: subscriber._organizationId,
    deleted: subscriber.deleted,
    data: subscriber.data,
    lastOnlineAt: subscriber.lastOnlineAt,
    isOnline: subscriber.isOnline,
    topics: subscriber.topics,
    channels: subscriber.channels,
  };
}
