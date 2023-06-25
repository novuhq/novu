import { ICredentials } from '@novu/shared';
import { ChannelTypeEnum } from '@novu/stateless';
import { BaseChatHandler } from './base.handler';
import { MattermostProvider } from '@novu/mattermost';

export class MattermostHandler extends BaseChatHandler {
  constructor() {
    super('mattermost', ChannelTypeEnum.CHAT);
  }

  buildProvider(_credentials: ICredentials) {
    this.provider = new MattermostProvider();
  }
}
