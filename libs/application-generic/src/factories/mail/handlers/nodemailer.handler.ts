import {
  ChannelTypeEnum,
  EmailProviderIdEnum,
  ICredentials,
} from '@novu/shared';
import { NodemailerProvider } from '@novu/providers';
import { BaseHandler } from './base.handler';

export class NodemailerHandler extends BaseHandler {
  constructor() {
    super(EmailProviderIdEnum.CustomSMTP, ChannelTypeEnum.EMAIL);
  }
  buildProvider(credentials: ICredentials, from?: string) {
    this.provider = new NodemailerProvider({
      from,
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
