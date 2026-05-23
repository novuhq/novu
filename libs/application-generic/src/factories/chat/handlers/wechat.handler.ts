import { WeChatProvider } from '@novu/providers';
import { ChatProviderIdEnum, ICredentials } from '@novu/shared';
import { ChannelTypeEnum } from '@novu/stateless';
import { BaseChatHandler } from './base.handler';

export class WeChatHandler extends BaseChatHandler {
  constructor() {
    super(ChatProviderIdEnum.WeChat, ChannelTypeEnum.CHAT);
  }

  buildProvider(_credentials: ICredentials) {
    this.provider = new WeChatProvider({});
  }
}
