import { IPushOptions, ISendMessageSuccessResponse } from '@novu/stateless';
import { ICredentials } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';

export interface IPushHandler {
  canHandle(providerId: string, channelType: ChannelTypeEnum);

  buildProvider(credentials: ICredentials);

  send(smsOptions: IPushOptions): Promise<ISendMessageSuccessResponse>;
}
