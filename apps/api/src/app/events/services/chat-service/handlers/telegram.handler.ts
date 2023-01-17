import { ICredentials } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/stateless';
import { BaseChatHandler } from './base.handler';
import { TelegramProvider } from '@novu/telegram';

export class TelegramHandler extends BaseChatHandler {
  constructor() {
    super('telegram', ChannelTypeEnum.CHAT);
  }

  buildProvider(_credentials: ICredentials) {
    const config: { botToken?: string } = { botToken: _credentials.token };
    this.provider = new TelegramProvider(config);
  }
}
