import { ICredentials } from '@novu/shared';
import { ChannelTypeEnum } from '@novu/stateless';
import { GrafanaOnCallChatProvider } from '@novu/providers';

import { BaseChatHandler } from './base.handler';

export class GrafanaOnCallHandler extends BaseChatHandler {
  constructor() {
    super('grafana-on-call', ChannelTypeEnum.CHAT);
  }

  buildProvider(credentials: ICredentials) {
    this.provider = new GrafanaOnCallChatProvider(credentials);
  }
}
