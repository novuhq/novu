import { ChannelTypeEnum, EmailProviderIdEnum, ICredentials } from '@novu/shared';
import { MailForwarderProvider } from '@novu/providers';

import { BaseHandler } from './base.handler';

export class MailForwarderHandler extends BaseHandler {
  constructor() {
    super(EmailProviderIdEnum.MailForwarder, ChannelTypeEnum.EMAIL);
  }

  buildProvider(credentials: ICredentials, from?: string) {
    console.log('[MailForwarderHandler] Received credentials:', JSON.stringify(credentials, null, 2));
    
    const config = {
      MAIL_FORWARDER_BUCKET: credentials['MAIL_FORWARDER_BUCKET'] as string,
      GCP_PROJECT_ID: credentials['GCP_PROJECT_ID'] as string,
      GCP_SERVICE_ACCOUNT_KEY_PATH: credentials['GCP_SERVICE_ACCOUNT_KEY_PATH'] as string,
      SERVICE_ACCOUNT_IDENTITY: credentials['SERVICE_ACCOUNT_IDENTITY'] as string,
      senderEmail: credentials['senderEmail'] as string,
      senderName: credentials['senderName'] as string,
      defaultFrom: credentials['defaultFrom'] as string,
    };

    this.provider = new MailForwarderProvider(config);
  }
}
