import { SubscriberEntity } from '@novu/dal';
import { isEqual } from 'lodash';

export function subscriberNeedUpdate(
  subscriber: SubscriberEntity,
  subscriberPayload: Partial<Omit<SubscriberEntity, 'channels'>>
): boolean {
  const emailChanged = 'email' in subscriberPayload && subscriber?.email !== subscriberPayload?.email;
  const firstNameChanged = 'firstName' in subscriberPayload && subscriber?.firstName !== subscriberPayload?.firstName;
  const lastNameChanged = 'lastName' in subscriberPayload && subscriber?.lastName !== subscriberPayload?.lastName;
  const phoneChanged = 'phone' in subscriberPayload && subscriber?.phone !== subscriberPayload?.phone;
  const avatarChanged = 'avatar' in subscriberPayload && subscriber?.avatar !== subscriberPayload?.avatar;
  const localeChanged = 'locale' in subscriberPayload && subscriber?.locale !== subscriberPayload?.locale;
  const timezoneChanged = 'timezone' in subscriberPayload && subscriber?.timezone !== subscriberPayload?.timezone;
  const dataChanged = 'data' in subscriberPayload && !isEqual(subscriber?.data, subscriberPayload?.data);

  return (
    emailChanged ||
    firstNameChanged ||
    lastNameChanged ||
    phoneChanged ||
    avatarChanged ||
    localeChanged ||
    timezoneChanged ||
    dataChanged
  );
}
