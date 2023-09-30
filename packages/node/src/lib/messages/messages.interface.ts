import { ChannelTypeEnum } from '@novu/shared';

export interface IMessages {
  deleteById(messageId: string);
  list(data?: IMessagesPayload);
}

export interface IMessagesPayload {
  page?: number;
  limit?: number;
  subscriberId?: string;
  channel?: ChannelTypeEnum;
  transactionIds?: string[];
}
