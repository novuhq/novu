import { ICredentials } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/stateless';
import { BaseChatHandler } from './base.handler';
import { SlackProvider } from '@novu/slack';

export class SlackHandler extends BaseChatHandler {
  constructor() {
    super('slack', ChannelTypeEnum.CHAT);
  }

  buildProvider(_: ICredentials) {
    this.provider = new SlackProvider();
  }
}
