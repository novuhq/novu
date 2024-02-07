import { RingCentralSmsProvider } from '@novu/ring-central';
import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';

export class RingCentralHandler extends BaseSmsHandler {
  constructor() {
    super('ring-central', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    if (
      !credentials.clientId ||
      !credentials.secretKey ||
      !credentials.token ||
      !credentials.from
    ) {
      throw Error('Invalid credentials');
    }

    this.provider = new RingCentralSmsProvider({
      clientId: credentials.clientId,
      clientSecret: credentials.secretKey,
      isSandBox: credentials.secure || false,
      jwtToken: credentials.token,
      from: credentials.from,
    });
  }
}
