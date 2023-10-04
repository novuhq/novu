import { ICredentials } from '@novu/shared';
import { ChannelTypeEnum } from '@novu/stateless';
import { BaseChatHandler } from './base.handler';
import { ZulipChatProvider } from '@novu/zulip';

export class ZulipHandler extends BaseChatHandler {
  constructor() {
    super('zulip', ChannelTypeEnum.CHAT);
  }

  buildProvider(_credentials: ICredentials) {
    this.provider = new ZulipChatProvider({});
  }
}
