import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';
import { FortySixElksSmsProvider } from '@novu/forty-six-elks';

export class FortySixElksHandler extends BaseSmsHandler {
  constructor() {
    super('forty-six-elks', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    this.provider = new FortySixElksSmsProvider({
      user: credentials.user,
      password: credentials.password,
      from: credentials.from,
    });
  }
}
