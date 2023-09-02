import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { AfricasTalkingSmsProvider } from '@novu/africas-talking';
import { BaseSmsHandler } from './base.handler';

export class AfricasTalkingSmsHandler extends BaseSmsHandler {
  constructor() {
    super('africas-talking', ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    if (!credentials.user || !credentials.apiKey || !credentials.from) {
      throw Error('Invalid credentials');
    }

    const config = {
      apiKey: credentials.apiKey,
      username: credentials.user,
      from: credentials.from,
    };

    this.provider = new AfricasTalkingSmsProvider(config);
  }
}
