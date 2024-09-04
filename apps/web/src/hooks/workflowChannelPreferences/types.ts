import { ChannelTypeEnum } from '@novu/shared';

type ChannelPreference = {
  defaultValue: boolean;
  readOnly: boolean;
};

export type WorkflowChannelPreferences = {
  workflow: ChannelPreference;
  channels: {
    [key in (typeof ChannelTypeEnum)[keyof typeof ChannelTypeEnum]]: ChannelPreference;
  };
};
