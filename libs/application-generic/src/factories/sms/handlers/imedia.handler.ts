import { IMediaSmsProvider } from '@novu/providers';
import { ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';

export class IMediaHandler extends BaseSmsHandler {
  constructor() {
    super(SmsProviderIdEnum.IMedia, ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    this.provider = new IMediaSmsProvider({
      token: credentials.token,
      from: credentials.from,
    });
  }
}
