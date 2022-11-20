import { ChannelTypeEnum } from '@novu/shared';
import { ICredentials } from '@novu/dal';
import { Outlook365Provider } from '@novu/outlook365';
import { BaseHandler } from './base.handler';

export class Outlook365Handler extends BaseHandler {
  constructor() {
    super('outlook365', ChannelTypeEnum.EMAIL);
  }

<<<<<<< HEAD
<<<<<<< HEAD
  buildProvider(credentials: ICredentials) {
    const config: {
      from: string;
      senderName: string;
      password: string;
    } = {
      from: credentials.from,
      senderName: credentials.senderName,
      password: credentials.password,
=======
  buildProvider(credentials: ICredentials, from: string) {
=======
  buildProvider(credentials: ICredentials) {
>>>>>>> 623a888d8 (feat: Updated docs, updated logo, updated config)
    const config: {
      user: string;
      password: string;
    } = {
      user: credentials.user,
      password: credentials.password,
<<<<<<< HEAD
      dkim: {
        domainName: credentials.domain,
        keySelector: credentials.accountSid,
        privateKey: credentials.secretKey,
      },
>>>>>>> df77c37be (feat: New Office365 provider)
=======
>>>>>>> 623a888d8 (feat: Updated docs, updated logo, updated config)
    };

    this.provider = new Outlook365Provider(config);
  }
}
