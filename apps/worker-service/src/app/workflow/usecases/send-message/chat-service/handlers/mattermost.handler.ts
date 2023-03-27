import { ICredentials } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/stateless';
import { MattermostProvider } from '@novu/mattermost';

import { BaseChatHandler } from './base.handler';

export class MattermostHandler extends BaseChatHandler {
  constructor() {
    super('mattermost', ChannelTypeEnum.CHAT);
  }

  buildProvider(_credentials: ICredentials) {
    this.provider = new MattermostProvider();
  }
}
