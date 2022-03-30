import { IEmailOptions, ISendMessageSuccessResponse } from '@novu/node';
import { ICredentials } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';

export interface IMailHandler {
  canHandle(providerId: string, channelType: ChannelTypeEnum);

  buildProvider(credentials: ICredentials, from: string);

  send(mailData: IEmailOptions): Promise<ISendMessageSuccessResponse>;
}
