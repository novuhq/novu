import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { NodemailerProvider } from '@novu/nodemailer';
import { BaseHandler } from './base.handler';

export class NodemailerHandler extends BaseHandler {
  constructor() {
    super('nodemailer', ChannelTypeEnum.EMAIL);
  }
  buildProvider(credentials: ICredentials, from?: string) {
    this.provider = new NodemailerProvider({
      from: from,
      host: credentials.host,
      port: Number(credentials.port),
      secure: credentials.secure,
      user: credentials.user,
      password: credentials.password,
      requireTls: credentials.requireTls,
      ignoreTls: credentials.ignoreTls,
      tlsOptions: credentials.tlsOptions,
      dkim: {
        domainName: credentials.domain,
        keySelector: credentials.accountSid,
        privateKey: credentials.secretKey,
      },
      senderName: credentials.senderName,
    });
  }
}
