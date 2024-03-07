import { ChannelTypeEnum, ICredentialsDto, ICredentials } from '@novu/shared';
import { MailchainEmailProvider } from '@novu/mailchain';
import { BaseHandler } from './base.handler';

export class MailchainHandler extends BaseHandler {
  constructor() {
    super('mailchain', ChannelTypeEnum.EMAIL);
  }

  buildProvider(credentials: ICredentials, from?: string) {
    const config: { secretRecoveryPhrase: string; from: string } = {
      secretRecoveryPhrase: credentials.secretPhrase,
      from: credentials.from,
    };

    this.provider = new MailchainEmailProvider(config);
  }
}
