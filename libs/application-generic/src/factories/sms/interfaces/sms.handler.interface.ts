import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { ISendMessageSuccessResponse, ISmsOptions, ISmsProvider } from '@novu/stateless';
import { IHandler } from '../../shared/interfaces';

export interface ISmsHandler extends IHandler {
  canHandle(providerId: string, channelType: ChannelTypeEnum);

  buildProvider(credentials: ICredentials);

  send(smsOptions: ISmsOptions): Promise<ISendMessageSuccessResponse>;

  getProvider(): ISmsProvider;
}
