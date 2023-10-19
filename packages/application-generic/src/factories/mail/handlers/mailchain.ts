import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { MailchainEmailProvider } from '@novu/mailchain';
import { BaseHandler } from './base.handler';

export class MailchainHandler extends BaseHandler {
  constructor() {
    super('mailchain', ChannelTypeEnum.EMAIL);
  }

  buildProvider(credentials: ICredentials, from?: string) {
    const config: {
      secretRecoveryPhrase: string;
      from: string;
      senderName?: string;
    } = {
      secretRecoveryPhrase: credentials.secretPhrase as string,
      from: from as string,
      senderName: credentials.senderName as string,
    };

    this.provider = new MailchainEmailProvider(config);
  }
}
