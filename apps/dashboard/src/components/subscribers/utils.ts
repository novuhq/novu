import { SubscriberResponseDto } from '@novu/api/models/components';
import { ISubscriberResponseDto } from '@novu/shared';

export const getSubscriberTitle = (subscriber: ISubscriberResponseDto | SubscriberResponseDto) => {
  const fullName = `${subscriber.firstName || ''} ${subscriber.lastName || ''}`.trim();
  return fullName || subscriber.email || subscriber.phone || subscriber.subscriberId;
};
