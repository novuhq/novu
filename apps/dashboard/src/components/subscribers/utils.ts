import { SubscriberResponseDto } from '@novu/api/models/components';

export const getSubscriberTitle = (subscriber: SubscriberResponseDto) => {
  const fullName = `${subscriber.firstName || ''} ${subscriber.lastName || ''}`.trim();
  return fullName || subscriber.email || subscriber.phone || subscriber.subscriberId;
};
