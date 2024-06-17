import { MobishastraProvider } from '@novu/providers';
import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';

export class MobishastraHandler extends BaseSmsHandler {
  constructor() {
    super('mobishastra', ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    this.provider = new MobishastraProvider({
      baseUrl: credentials.baseUrl,
      username: credentials.user,
      password: credentials.password,
      from: credentials.from,
    });
  }
}
