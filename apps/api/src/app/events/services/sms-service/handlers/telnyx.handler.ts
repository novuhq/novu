import { ChannelTypeEnum } from '@notifire/shared';
import { TelnyxSmsProvider } from '@notifire/telnyx';
import { ICredentials } from '@notifire/dal';
import { BaseSmsHandler } from './base.handler';

export class TelnyxHandler extends BaseSmsHandler {
  constructor() {
    super('telnyx', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    const config: {
      apiKey: string;
      from: string;
      messageProfileId: string;
    } = { apiKey: credentials.apiKey, from: credentials.from, messageProfileId: credentials.messageProfileId };

    this.provider = new TelnyxSmsProvider(config);
  }
}
