import { ChannelTypeEnum } from '../channel';

export type ChannelPreference = {
  defaultValue: boolean;
  readOnly: boolean;
};

export type WorkflowChannelPreferences = {
  workflow: ChannelPreference;
  channels: Record<ChannelTypeEnum, ChannelPreference>;
};
