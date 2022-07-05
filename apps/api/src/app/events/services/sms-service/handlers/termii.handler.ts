import { ChannelTypeEnum } from '@novu/shared';
import { TermiiSmsProvider } from '@novu/termii';
import { ICredentials } from '@novu/dal';
import { BaseSmsHandler } from './base.handler';

export class TermiiSmsHandler extends BaseSmsHandler {
  constructor() {
    super('termii', ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    const config: {
      apiKey: string;
      from: string;
    } = { apiKey: credentials.apiKey, from: credentials.from };

    this.provider = new TermiiSmsProvider(config);
  }
}
