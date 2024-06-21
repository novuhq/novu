import { VerimorSmsProvider } from '@novu/providers';
import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';

export class VerimorHandler extends BaseSmsHandler {
  constructor() {
    super('verimor', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    this.provider = new VerimorSmsProvider({
      username: credentials.user,
      password: credentials.password,
      from: credentials.from,
    });
  }
}
