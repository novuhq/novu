import { MessageBirdSmsProvider } from '@novu/providers';
import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';

export class MessageBirdHandler extends BaseSmsHandler {
  constructor() {
    super('messagebird', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    this.provider = new MessageBirdSmsProvider({
      access_key: credentials.accessKey,
    });
  }
}
