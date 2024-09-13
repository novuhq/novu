import { ChannelTypeEnum, IncompleteWorkflowChannelPreferences } from '@novu/shared';
import { WorkflowChannelEnum } from '../../constants';
import { WorkflowOptionsPreferences } from '../../types';

/** Correlate user-friendly channels to system-friendly channels */
const WORKFLOW_CHANNEL_TO_CHANNEL_TYPE: Record<WorkflowChannelEnum, ChannelTypeEnum> = {
  [WorkflowChannelEnum.EMAIL]: ChannelTypeEnum.EMAIL,
  [WorkflowChannelEnum.SMS]: ChannelTypeEnum.SMS,
  [WorkflowChannelEnum.PUSH]: ChannelTypeEnum.PUSH,
  [WorkflowChannelEnum.IN_APP]: ChannelTypeEnum.IN_APP,
  [WorkflowChannelEnum.CHAT]: ChannelTypeEnum.CHAT,
};

/** Map preferences between user-friendly and system-friendly values / keys */
export function mapPreferences(
  preferences?: WorkflowOptionsPreferences
): IncompleteWorkflowChannelPreferences | undefined {
  if (!preferences) {
    return;
  }

  const output: IncompleteWorkflowChannelPreferences = {};

  if (preferences.workflow) {
    output.workflow = preferences.workflow;
  }

  // map between framework user-friendly enum (with camelCasing) to shared ChannelTypeEnum if the entry exists
  Object.entries(preferences.channels || {}).forEach(([userFriendlyChannel, channelLevelPreference]) => {
    const systemChannel = WORKFLOW_CHANNEL_TO_CHANNEL_TYPE[userFriendlyChannel as WorkflowChannelEnum];
    if (systemChannel) {
      if (!output.channels) {
        output.channels = {};
      }
      output.channels[systemChannel] = channelLevelPreference;
    }
  });

  return output;
}
