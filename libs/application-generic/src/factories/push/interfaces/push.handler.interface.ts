import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { IPushOptions, ISendMessageSuccessResponse } from '@novu/stateless';

export interface IPushHandler {
  canHandle(providerId: string, channelType: ChannelTypeEnum);

  buildProvider(credentials: ICredentials);

  send(smsOptions: IPushOptions): Promise<ISendMessageSuccessResponse>;
}
