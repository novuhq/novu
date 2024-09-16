import {
  IconType,
  IconDynamicFeed,
  IconNotificationsNone,
  IconOutlineMailOutline,
  IconOutlineSms,
  IconAdUnits,
  IconOutlineForum,
} from '@novu/design-system';
import { ChannelTypeEnum, WorkflowChannelPreferences } from '@novu/shared';
import { CHANNEL_TYPE_TO_STRING } from '../../../../utils/channels';
import { PreferenceChannelName } from './types';

export const CHANNEL_SETTINGS_LOGO_LOOKUP: Record<PreferenceChannelName, IconType> = {
  workflow: IconDynamicFeed,
  [ChannelTypeEnum.IN_APP]: IconNotificationsNone,
  [ChannelTypeEnum.EMAIL]: IconOutlineMailOutline,
  [ChannelTypeEnum.SMS]: IconOutlineSms,
  [ChannelTypeEnum.PUSH]: IconAdUnits,
  [ChannelTypeEnum.CHAT]: IconOutlineForum,
};

export const CHANNEL_LABELS_LOOKUP: Record<PreferenceChannelName, string> = {
  ...CHANNEL_TYPE_TO_STRING,
  workflow: 'Workflow',
};

const PREFERENCE_DEFAULT_READ_ONLY = true;
const PREFERENCE_DEFAULT_VALUE = false;
export const DEFAULT_WORKFLOW_PREFERENCES: WorkflowChannelPreferences = {
  workflow: {
    defaultValue: PREFERENCE_DEFAULT_READ_ONLY,
    readOnly: PREFERENCE_DEFAULT_VALUE,
  },
  channels: {
    in_app: {
      defaultValue: PREFERENCE_DEFAULT_READ_ONLY,
      readOnly: PREFERENCE_DEFAULT_VALUE,
    },
    sms: {
      defaultValue: PREFERENCE_DEFAULT_READ_ONLY,
      readOnly: PREFERENCE_DEFAULT_VALUE,
    },
    email: {
      defaultValue: PREFERENCE_DEFAULT_READ_ONLY,
      readOnly: PREFERENCE_DEFAULT_VALUE,
    },
    push: {
      defaultValue: PREFERENCE_DEFAULT_READ_ONLY,
      readOnly: PREFERENCE_DEFAULT_VALUE,
    },
    chat: {
      defaultValue: PREFERENCE_DEFAULT_READ_ONLY,
      readOnly: PREFERENCE_DEFAULT_VALUE,
    },
  },
};
