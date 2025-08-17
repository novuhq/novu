import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { ISendMessageSuccessResponse, ISmsOptions, ISmsProvider } from '@novu/stateless';

export interface ISmsHandler {
  canHandle(providerId: string, channelType: ChannelTypeEnum);

  buildProvider(credentials: ICredentials);

  send(smsOptions: ISmsOptions): Promise<ISendMessageSuccessResponse>;

  getProvider(): ISmsProvider;
}
