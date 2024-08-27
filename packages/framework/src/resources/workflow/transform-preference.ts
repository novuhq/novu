import { ChannelTypeEnum } from '@novu/shared';
import type {
  WorkflowOptionsPreference,
  DiscoverWorkflowOutputPreference,
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

export function transformPreference(preference?: WorkflowOptionsPreference): DiscoverWorkflowOutputPreference {
  return {
    workflow: setPreference(preference?.workflow),
    channels: {
      [ChannelTypeEnum.EMAIL]: setPreference(preference?.channels?.[ChannelTypeEnum.EMAIL]),
      [ChannelTypeEnum.SMS]: setPreference(preference?.channels?.[ChannelTypeEnum.SMS]),
      [ChannelTypeEnum.PUSH]: setPreference(preference?.channels?.[ChannelTypeEnum.PUSH]),
      [ChannelTypeEnum.IN_APP]: setPreference(preference?.channels?.[ChannelTypeEnum.IN_APP]),
      [ChannelTypeEnum.CHAT]: setPreference(preference?.channels?.[ChannelTypeEnum.CHAT]),
    },
  };
}
