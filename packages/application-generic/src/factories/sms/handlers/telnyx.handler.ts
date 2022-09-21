import { ChannelTypeEnum } from '@novu/shared';
import { TelnyxSmsProvider } from '@novu/telnyx';
import { ICredentials } from '@novu/dal';
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
    } = {
      apiKey: credentials.apiKey,
      from: credentials.from,
      messageProfileId: credentials.messageProfileId,
    };

    this.provider = new TelnyxSmsProvider(config);
  }
}
