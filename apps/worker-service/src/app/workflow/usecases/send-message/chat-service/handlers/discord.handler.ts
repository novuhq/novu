import { ICredentials } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/stateless';
import { DiscordProvider } from '@novu/discord';

import { BaseChatHandler } from './base.handler';

export class DiscordHandler extends BaseChatHandler {
  constructor() {
    super('discord', ChannelTypeEnum.CHAT);
  }

  buildProvider(_credentials: ICredentials) {
    this.provider = new DiscordProvider({});
  }
}
