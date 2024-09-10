import { ChannelTypeEnum } from '../channel';

type ChannelPreference = {
  defaultValue: boolean;
  readOnly: boolean;
};

export type WorkflowChannelPreferences = {
  workflow: ChannelPreference;
  channels: Record<ChannelTypeEnum, ChannelPreference>;
};
