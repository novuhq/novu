import { ChannelTypeEnum, WorkflowPreferencesPartial } from '../../shared';
import { WorkflowChannelEnum } from '../../constants';
import { WorkflowPreferences } from '../../types';

/** Correlate user-friendly channels to system-friendly channels */
const CHANNEL_TYPE_FROM_WORKFLOW_CHANNEL: Record<WorkflowChannelEnum, ChannelTypeEnum> = {
  [WorkflowChannelEnum.EMAIL]: ChannelTypeEnum.EMAIL,
  [WorkflowChannelEnum.SMS]: ChannelTypeEnum.SMS,
  [WorkflowChannelEnum.PUSH]: ChannelTypeEnum.PUSH,
  [WorkflowChannelEnum.IN_APP]: ChannelTypeEnum.IN_APP,
  [WorkflowChannelEnum.CHAT]: ChannelTypeEnum.CHAT,
};

/** Map preferences between user-friendly and system-friendly values / keys */
export function mapPreferences(preferences?: WorkflowPreferences): WorkflowPreferencesPartial {
  if (!preferences) {
    return {};
  }

  const output: WorkflowPreferencesPartial = {};

  if (preferences.all) {
    output.all = preferences.all;
  }

  // map between framework user-friendly enum (with camelCasing) to shared ChannelTypeEnum if the entry exists
  Object.entries(preferences.channels || {}).forEach(([developerFriendlyChannel, channelLevelPreference]) => {
    const systemChannel = CHANNEL_TYPE_FROM_WORKFLOW_CHANNEL[developerFriendlyChannel as WorkflowChannelEnum];
    if (systemChannel) {
      if (!output.channels) {
        output.channels = {};
      }
      output.channels[systemChannel] = channelLevelPreference;
    }
  });

  return output;
}
