import { ISendMessageSuccessResponse, ISmsOptions } from '@novu/node';
import { ICredentials } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';

export interface ISmsHandler {
  canHandle(providerId: string, channelType: ChannelTypeEnum);

  buildProvider(credentials: ICredentials);

  send(smsOptions: ISmsOptions): Promise<ISendMessageSuccessResponse>;
}
