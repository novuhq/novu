import { GrafanaOnCallChatProvider } from '@novu/providers';
import { ChatProviderIdEnum, ICredentials } from '@novu/shared';
import { ChannelTypeEnum } from '@novu/stateless';

import { BaseChatHandler } from './base.handler';

export class GrafanaOnCallHandler extends BaseChatHandler {
  constructor() {
    super(ChatProviderIdEnum.GrafanaOnCall, ChannelTypeEnum.CHAT);
  }

  buildProvider(credentials: ICredentials) {
    this.provider = new GrafanaOnCallChatProvider(credentials);
  }
}
