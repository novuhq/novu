import { SendblueChatProvider } from '@novu/providers';
import { ChannelTypeEnum, ChatProviderIdEnum, ICredentials } from '@novu/shared';
import { BaseChatHandler } from './base.handler';

export class SendblueHandler extends BaseChatHandler {
  constructor() {
    super(ChatProviderIdEnum.Sendblue, ChannelTypeEnum.CHAT);
  }

  buildProvider(credentials: ICredentials) {
    this.provider = new SendblueChatProvider({
      apiKey: credentials.apiKey as string,
      secretKey: credentials.secretKey as string,
      from: credentials.from as string,
    });
  }
}
