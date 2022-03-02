import { ChannelTypeEnum } from '../../entities/message-template';

export interface IProvider {
  id: string;
  displayName: string;
  channel: ChannelTypeEnum;
}
