import { ICredentials } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/stateless';
import { BaseChatHandler } from './base.handler';
import { LinenotifyProvider } from '@novu/linenotify';

export class LINENotifyHandler extends BaseChatHandler {
  constructor() {
    super('linenotify', ChannelTypeEnum.CHAT);
  }

  buildProvider(credentials: ICredentials) {
    const config: {
      authToken: string;
    } = { authToken: credentials.token };

    this.provider = new LinenotifyProvider(config);
  }
}
