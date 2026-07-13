import { GoogleChatProvider } from '@novu/providers';
import { ChatProviderIdEnum, ICredentials } from '@novu/shared';
import { ChannelTypeEnum } from '@novu/stateless';
import { BaseChatHandler } from './base.handler';

export class GoogleChatHandler extends BaseChatHandler {
  constructor() {
    super(ChatProviderIdEnum.GoogleChat, ChannelTypeEnum.CHAT);
  }

  buildProvider(_credentials: ICredentials) {
    this.provider = new GoogleChatProvider({});
  }
}
