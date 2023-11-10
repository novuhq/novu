import { ICredentials, ChatProviderIdEnum } from '@novu/shared';
import { ChannelTypeEnum } from '@novu/stateless';
import { BaseChatHandler } from './base.handler';
import { ZulipProvider } from '@novu/zulip';

export class ZulipHandler extends BaseChatHandler {
  constructor() {
    super(ChatProviderIdEnum.Zulip, ChannelTypeEnum.CHAT);
  }

  buildProvider(_credentials: ICredentials) {
    this.provider = new ZulipProvider({});
  }
}
