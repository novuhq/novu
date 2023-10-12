import { ICredentials } from '@novu/shared';
import { ChannelTypeEnum } from '@novu/stateless';
import { BaseChatHandler } from './base.handler';
import { GoogleChatProvider } from '@novu/google-chat';

export class GoogleChatHandler extends BaseChatHandler {
  constructor() {
    super('google-chat', ChannelTypeEnum.CHAT);
  }

  buildProvider(_credentials: ICredentials) {
    this.provider = new GoogleChatProvider({});
  }
}
