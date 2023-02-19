import { ChannelTypeEnum } from '@novu/shared';
import { ICredentials } from '@novu/dal';
import { RingcentralSmsProvider } from '@novu/ringcentral';
import { BaseSmsHandler } from './base.handler';

export class RingCentralHandler extends BaseSmsHandler {
  constructor() {
    super('ringcentral', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    const config: { server: string; clientId: string; clientSecret: string; from?: string } = {
      server: credentials.baseUrl,
      clientId: credentials.clientId,
      clientSecret: credentials.secretKey,
      from: credentials.from,
    };

    this.provider = new RingcentralSmsProvider(config);
  }
}
