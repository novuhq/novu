import { ChannelTypeEnum } from '../../../types';

export interface IUpdateSubscriberPreferenceDto {
  channel?: IChannelPreference;

  enabled?: boolean;
}

export interface IChannelPreference {
  type: ChannelTypeEnum;

  enabled: boolean;
}
