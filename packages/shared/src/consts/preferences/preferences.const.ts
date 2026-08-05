import { ChannelPreference, ChannelTypeEnum, WorkflowPreference, WorkflowPreferences } from '../../types';

export const PREFERENCE_DEFAULT_VALUE: WorkflowPreference['enabled'] = true;
export const PREFERENCE_DEFAULT_READ_ONLY: WorkflowPreference['readOnly'] = false;

export const WORKFLOW_PREFERENCE_DEFAULT: WorkflowPreference = {
  enabled: PREFERENCE_DEFAULT_VALUE,
  readOnly: PREFERENCE_DEFAULT_READ_ONLY,
};

export const CHANNEL_PREFERENCE_DEFAULT: ChannelPreference = {
  enabled: PREFERENCE_DEFAULT_VALUE,
};

export const DEFAULT_WORKFLOW_PREFERENCES: WorkflowPreferences = {
  all: WORKFLOW_PREFERENCE_DEFAULT,
  channels: {
    in_app: CHANNEL_PREFERENCE_DEFAULT,
    sms: CHANNEL_PREFERENCE_DEFAULT,
    email: CHANNEL_PREFERENCE_DEFAULT,
    push: CHANNEL_PREFERENCE_DEFAULT,
    chat: CHANNEL_PREFERENCE_DEFAULT,
    tool: CHANNEL_PREFERENCE_DEFAULT,
  },
};

/** Channels with no designed preference experience yet; hidden from every preference UI (NV-8502). */
export const PREFERENCE_UI_HIDDEN_CHANNELS: ChannelTypeEnum[] = [ChannelTypeEnum.TOOL];

export const isPreferenceChannelVisibleInUi = (channel: string): boolean =>
  !PREFERENCE_UI_HIDDEN_CHANNELS.includes(channel as ChannelTypeEnum);

export enum WorkflowCriticalityEnum {
  CRITICAL = 'critical',
  NON_CRITICAL = 'nonCritical',
  ALL = 'all',
}
