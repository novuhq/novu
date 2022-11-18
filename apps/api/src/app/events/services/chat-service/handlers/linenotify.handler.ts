import { ICredentials } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/stateless';
import { BaseChatHandler } from './base.handler';
import { LineNotifyProvider } from '@novu/line-notify';

export class LineNotifyHandler extends BaseChatHandler {
  constructor() {
    super('linenotify', ChannelTypeEnum.CHAT);
  }

  buildProvider(credentials: ICredentials) {
    const config: {
      authToken: string;
    } = { authToken: credentials.token };

    this.provider = new LineNotifyProvider(config);
  }
}
