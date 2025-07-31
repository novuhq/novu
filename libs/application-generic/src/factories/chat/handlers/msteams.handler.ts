import { MsTeamsProvider } from '@novu/providers';
import { ChatProviderIdEnum, ICredentials } from '@novu/shared';
import { ChannelTypeEnum } from '@novu/stateless';
import { BaseChatHandler } from './base.handler';

export class MSTeamsHandler extends BaseChatHandler {
  constructor() {
    super(ChatProviderIdEnum.MsTeams, ChannelTypeEnum.CHAT);
  }

  buildProvider(_credentials: ICredentials) {
    this.provider = new MsTeamsProvider({});
  }
}
