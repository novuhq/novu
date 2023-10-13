import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { MessagebirdSmsProvider } from '@novu/messagebird';
import { BaseSmsHandler } from './base.handler';

export class MessagebirdHandler extends BaseSmsHandler {
  constructor() {
    super('messagebird', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    this.provider = new MessagebirdSmsProvider({
      apiKey: credentials.apiKey,
    });
  }
}
