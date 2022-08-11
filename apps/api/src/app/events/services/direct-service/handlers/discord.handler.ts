import { ICredentials } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/stateless';
import { BaseDirectHandler } from './base.handler';
import { DiscordProvider } from '@novu/discord';

export class DiscordHandler extends BaseDirectHandler {
  constructor() {
    super('discord', ChannelTypeEnum.DIRECT);
  }

  buildProvider(_credentials: ICredentials) {
    this.provider = new DiscordProvider({});
  }
}
