import { LineChatProvider } from '@novu/providers';
import { ChannelTypeEnum, ChatProviderIdEnum, ICredentials } from '@novu/shared';
import { BaseChatHandler } from './base.handler';

export class LineHandler extends BaseChatHandler {
  constructor() {
    super(ChatProviderIdEnum.Line, ChannelTypeEnum.CHAT);
  }

  buildProvider(credentials: ICredentials) {
    this.provider = new LineChatProvider({
      channelAccessToken: credentials.apiToken,
    });
  }
}
