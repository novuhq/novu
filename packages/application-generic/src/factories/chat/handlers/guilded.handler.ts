import { ChannelTypeEnum } from '@novu/shared';
import { GuildedChatProvider } from '@novu/guilded';
import { ICredentials } from '@novu/shared';
import { BaseChatHandler } from './base.handler';

export class GuildedHandler extends BaseChatHandler {
  constructor() {
    super('guilded', ChannelTypeEnum.CHAT);
  }

  buildProvider(_credentials: ICredentials) {
    this.provider = new GuildedChatProvider();
  }
}

export * from './guilded.handler';
