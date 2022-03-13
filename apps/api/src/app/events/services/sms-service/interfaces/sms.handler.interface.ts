import { ISmsOptions } from '@notifire/core';
import { ICredentials } from '@notifire/dal';
import { ChannelTypeEnum } from '@notifire/shared';

export interface ISmsHandler {
  canHandle(providerId: string, channelType: ChannelTypeEnum);

  buildProvider(credentials: ICredentials, from: string);

  send(smsOptions: ISmsOptions): Promise<void>;
}
