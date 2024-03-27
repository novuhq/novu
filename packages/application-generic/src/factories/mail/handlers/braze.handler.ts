import { BrazeEmailProvider } from '@novu/braze';
import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { BaseHandler } from './base.handler';

export class BrazeEmailHandler extends BaseHandler {
  constructor() {
    super('braze', ChannelTypeEnum.EMAIL);
  }
  buildProvider(credentials: ICredentials) {
    const config: {
      apiKey: string;
      apiURL: string;
      appID: string;
    } = {
      apiKey: credentials.apiKey as string,
      apiURL: credentials.apiURL as string,
      appID: credentials.appID as string,
    };

    this.provider = new BrazeEmailProvider(config);
  }
}
