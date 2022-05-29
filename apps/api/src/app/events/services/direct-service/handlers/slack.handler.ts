import { ICredentials } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/stateless';
import { BaseDirectHandler } from './base.handler';
import { SlackProvider } from '@novu/slack';

export class SlackHandler extends BaseDirectHandler {
  constructor() {
    super('slack', ChannelTypeEnum.DIRECT);
  }

  buildProvider(credentials: ICredentials) {
    const config: {
      applicationId: string;
      clientId: string;
      secretKey: string;
    } = { applicationId: credentials.applicationId, clientId: credentials.clientId, secretKey: credentials.secretKey };

    this.provider = new SlackProvider(config);
  }
}
