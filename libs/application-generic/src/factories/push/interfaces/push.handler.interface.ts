import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { IPushOptions, ISendMessageSuccessResponse } from '@novu/stateless';
import { IHandler } from '../../shared/interfaces';

export interface IPushHandler extends IHandler {
  isTokenInvalid?(error: string): boolean;

  canHandle(providerId: string, channelType: ChannelTypeEnum);

  buildProvider(credentials: ICredentials);

  send(smsOptions: IPushOptions): Promise<ISendMessageSuccessResponse>;
}
