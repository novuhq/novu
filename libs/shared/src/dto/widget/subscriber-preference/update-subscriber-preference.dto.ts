import { ChannelTypeEnum } from '../../../entities/message-template';

export interface IUpdateSubscriberPreferenceDto {
  channel?: IChannelPreference;

  enabled?: boolean;
}

export interface IChannelPreference {
  type: ChannelTypeEnum;

  enabled: boolean;
}
