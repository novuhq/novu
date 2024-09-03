import { ChannelTypeEnum } from '@novu/stateless';

import { ChatProviderIdEnum, ICredentials } from '@novu/shared';
import { GetstreamChatProvider } from '@novu/providers';
import { BaseChatHandler } from './base.handler';

export class GetstreamChatHandler extends BaseChatHandler {
  constructor() {
    super(ChatProviderIdEnum.GetStream, ChannelTypeEnum.CHAT);
  }

  buildProvider(credentials: ICredentials) {
    const config: {
      apiKey: string;
    } = {
      apiKey: credentials.apiKey as string,
    };
    this.provider = new GetstreamChatProvider(config);
  }
}
