import { ChannelTypeEnum } from '@novu/shared';
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
    channels: {
      [ChannelTypeEnum.EMAIL]: setPreference(preferences?.channels?.[ChannelTypeEnum.EMAIL]),
      [ChannelTypeEnum.SMS]: setPreference(preferences?.channels?.[ChannelTypeEnum.SMS]),
      [ChannelTypeEnum.PUSH]: setPreference(preferences?.channels?.[ChannelTypeEnum.PUSH]),
      [ChannelTypeEnum.IN_APP]: setPreference(preferences?.channels?.[ChannelTypeEnum.IN_APP]),
      [ChannelTypeEnum.CHAT]: setPreference(preferences?.channels?.[ChannelTypeEnum.CHAT]),
    },
  };
}
