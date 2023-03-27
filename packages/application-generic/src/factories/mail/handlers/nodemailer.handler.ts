import { ChannelTypeEnum } from '@novu/shared';
import { ICredentials } from '@novu/dal';
import { NodemailerProvider } from '@novu/nodemailer';
import { BaseHandler } from './base.handler';
import { ConnectionOptions } from 'tls';

export class NodemailerHandler extends BaseHandler {
  constructor() {
    super('nodemailer', ChannelTypeEnum.EMAIL);
  }
  buildProvider(credentials: ICredentials, from?: string) {
    const config: {
      from: string;
      host: string;
      port: number;
      secure?: boolean;
      user?: string;
      password?: string;
      requireTls: boolean;
      ignoreTls: boolean;
      tlsOptions: ConnectionOptions;
      dkim?: {
        domainName: string;
        keySelector: string;
        privateKey: string;
      };
    } = {
      from: from as string,
      host: credentials.host as string,
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
    };

    this.provider = new NodemailerProvider(config);
  }
}
