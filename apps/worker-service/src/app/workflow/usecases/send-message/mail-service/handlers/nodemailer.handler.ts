import { ChannelTypeEnum } from '@novu/shared';
import { ICredentials } from '@novu/dal';
import { NodemailerProvider } from '@novu/nodemailer';
import { ConnectionOptions } from 'tls';

import { BaseHandler } from './base.handler';

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
      user: string;
      password: string;
      requireTls: boolean;
      ignoreTls: boolean;
      tlsOptions: ConnectionOptions;
      dkim: {
        domainName: string;
        keySelector: string;
        privateKey: string;
      };
    } = {
      from: from as string,
      host: credentials.host as string,
      port: Number(credentials.port),
      secure: credentials.secure as boolean,
      user: credentials.user as string,
      password: credentials.password as string,
      requireTls: credentials.requireTls as boolean,
      ignoreTls: credentials.ignoreTls as boolean,
      tlsOptions: credentials.tlsOptions as ConnectionOptions,
      dkim: {
        domainName: credentials.domain as string,
        keySelector: credentials.accountSid as string,
        privateKey: credentials.secretKey as string,
      },
    };

    this.provider = new NodemailerProvider(config);
  }
}
