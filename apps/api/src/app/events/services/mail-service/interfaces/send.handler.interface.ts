import { IEmailOptions, ISendMessageSuccessResponse } from '@notifire/core';
import { ICredentials } from '@notifire/dal';
import { ChannelTypeEnum } from '@notifire/shared';

export interface IMailHandler {
  canHandle(providerId: string, channelType: ChannelTypeEnum);

  buildProvider(credentials: ICredentials, from: string);

  send(mailData: IEmailOptions): Promise<ISendMessageSuccessResponse>;
}
