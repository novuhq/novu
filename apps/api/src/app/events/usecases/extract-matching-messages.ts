import { NotificationStepEntity } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import { matchMessageWithFilters } from './trigger-event/message-filter.matcher';

export const extractMatchingMessages = (steps: NotificationStepEntity[], payload) => {
  const smsMessages = matchMessageWithFilters(ChannelTypeEnum.SMS, steps, payload);
  const inAppChannelMessages = matchMessageWithFilters(ChannelTypeEnum.IN_APP, steps, payload);
  const emailChannelMessages = matchMessageWithFilters(ChannelTypeEnum.EMAIL, steps, payload);

  return { smsMessages, inAppChannelMessages, emailChannelMessages };
};
