import { UnifonicSmsProvider } from '@novu/providers';
import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';

export class UnifonicHandler extends BaseSmsHandler {
  constructor() {
    super('unifonic', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    this.provider = new UnifonicSmsProvider({
      appSid: credentials.appSid,
      senderId: credentials.senderId,
    });
  }
}
