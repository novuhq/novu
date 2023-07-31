import { SubscriberEntity } from '@novu/dal';
import { isEqual } from 'lodash';

export function subscriberNeedUpdate(
  subscriber: SubscriberEntity,
  subscriberPayload: Partial<SubscriberEntity>
): boolean {
  return (
    !!(
      (subscriberPayload?.email &&
        subscriber?.email !== subscriberPayload?.email) ||
      (subscriber?.email !== undefined &&
        subscriber?.email !== subscriberPayload?.email)
    ) ||
    !!(
      subscriberPayload?.firstName &&
      subscriber?.firstName !== subscriberPayload?.firstName
    ) ||
    !!(
      subscriberPayload?.lastName &&
      subscriber?.lastName !== subscriberPayload?.lastName
    ) ||
    !!(
      subscriberPayload?.phone && subscriber?.phone !== subscriberPayload?.phone
    ) ||
    !!(
      subscriberPayload?.avatar &&
      subscriber?.avatar !== subscriberPayload?.avatar
    ) ||
    !!(
      subscriberPayload?.locale &&
      subscriber?.locale !== subscriberPayload?.locale
    ) ||
    !!(
      subscriberPayload?.data &&
      !isEqual(subscriber?.data, subscriberPayload?.data)
    )
  );
}
