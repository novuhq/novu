import { ChannelTypeEnum } from '../channel';

export type ChannelPreference = {
  defaultValue: boolean;
  readOnly: boolean;
};

export type WorkflowChannelPreferences = {
  workflow: ChannelPreference;
  channels: Record<ChannelTypeEnum, ChannelPreference>;
};

export type IncompleteWorkflowChannelPreferences = {
  workflow?: Partial<ChannelPreference>;
  channels?: Partial<Record<ChannelTypeEnum, Partial<ChannelPreference>>>;
};
