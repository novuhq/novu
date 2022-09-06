import { ICredentials } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/stateless';
import { BaseChatHandler } from './base.handler';
import { MsTeamsProvider } from '@novu/msteams';

export class MSTeamsHandler extends BaseChatHandler {
  constructor() {
    super('msteams', ChannelTypeEnum.CHAT);
  }

  buildProvider(_credentials: ICredentials) {
    this.provider = new MsTeamsProvider({});
  }
}
