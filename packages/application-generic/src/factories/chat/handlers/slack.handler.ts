import { ICredentials } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/stateless';
import { BaseChatHandler } from './base.handler';
import { SlackProvider } from '@novu/slack';

export class SlackHandler extends BaseChatHandler {
  constructor() {
    super('slack', ChannelTypeEnum.CHAT);
  }

  buildProvider(credentials: ICredentials) {
    const config: {
      applicationId: string;
      clientId: string;
      secretKey: string;
    } = {
      applicationId: credentials.applicationId,
      clientId: credentials.clientId,
      secretKey: credentials.secretKey,
    };

    this.provider = new SlackProvider(config);
  }
}
