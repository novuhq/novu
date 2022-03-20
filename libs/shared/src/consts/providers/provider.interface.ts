import { ChannelTypeEnum } from '../../entities/message-template';

export interface ISharedProvider {
  id: string;
  displayName: string;
  channel: ChannelTypeEnum;
  comingSoon?: boolean;
}
