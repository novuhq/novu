import { ChannelTypeEnum } from '@novu/shared';
import { WorkflowOptionsChannelEnum } from '../../constants';
import type {
  WorkflowOptionsPreferences,
  DiscoverWorkflowOutputPreferences,
  ChannelPreference,
  WorkflowOptionChannelPreference,
} from '../../types';

const setPreference = (preference: WorkflowOptionChannelPreference = {}): ChannelPreference => {
  const defaultValue: boolean = preference?.defaultValue !== undefined ? (preference?.defaultValue as boolean) : true;
  const readOnly: ChannelPreference['readOnly'] = preference?.readOnly ? preference?.readOnly : false;

  return {
    defaultValue,
    readOnly,
  };
};

export function buildPreferences(preferences?: WorkflowOptionsPreferences): DiscoverWorkflowOutputPreferences {
  return {
    workflow: setPreference(preferences?.workflow),
    // map between framework user-friendly enum (with camelCasing) to shared ChannelTypeEnum
    channels: {
      [ChannelTypeEnum.EMAIL]: setPreference(preferences?.channels?.[WorkflowOptionsChannelEnum.EMAIL]),
      [ChannelTypeEnum.SMS]: setPreference(preferences?.channels?.[WorkflowOptionsChannelEnum.SMS]),
      [ChannelTypeEnum.PUSH]: setPreference(preferences?.channels?.[WorkflowOptionsChannelEnum.PUSH]),
      [ChannelTypeEnum.IN_APP]: setPreference(preferences?.channels?.[WorkflowOptionsChannelEnum.IN_APP]),
      [ChannelTypeEnum.CHAT]: setPreference(preferences?.channels?.[WorkflowOptionsChannelEnum.CHAT]),
    },
  };
}
