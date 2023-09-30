import { MaqsamSmsProvider } from '@novu/maqsam';
import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';

export class MaqsamHandler extends BaseSmsHandler {
  constructor() {
    super('maqsam', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    this.provider = new MaqsamSmsProvider({
      accessKeyId: credentials.apiKey,
      accessSecret: credentials.secretKey,
      from: credentials.from,
    });
  }
}
