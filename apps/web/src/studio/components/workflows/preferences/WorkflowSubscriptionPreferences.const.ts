import {
  IconType,
  IconDynamicFeed,
  IconNotificationsNone,
  IconOutlineMailOutline,
  IconOutlineSms,
  IconAdUnits,
  IconOutlineForum,
} from '@novu/design-system';
import { ChannelTypeEnum } from '@novu/shared';
import { CHANNEL_TYPE_TO_STRING } from '../../../../utils/channels';
import { PreferenceChannelName } from './types';

export const CHANNEL_SETTINGS_LOGO_LOOKUP: Record<PreferenceChannelName, IconType> = {
  all: IconDynamicFeed,
  [ChannelTypeEnum.IN_APP]: IconNotificationsNone,
  [ChannelTypeEnum.EMAIL]: IconOutlineMailOutline,
  [ChannelTypeEnum.SMS]: IconOutlineSms,
  [ChannelTypeEnum.PUSH]: IconAdUnits,
  [ChannelTypeEnum.CHAT]: IconOutlineForum,
};

export const CHANNEL_LABELS_LOOKUP: Record<PreferenceChannelName, string> = {
  ...CHANNEL_TYPE_TO_STRING,
  all: 'All',
};
