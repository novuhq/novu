import { ChannelTypeEnum } from '@novu/shared';
import { ICredentials } from '@novu/dal';
import { NodemailerProvider } from '@novu/nodemailer';
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
      secure: boolean;
      user: string;
      password: string;
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
      user: credentials.user ,
      password: credentials.password,
      dkim: {
        domainName: credentials.domain as string,
        keySelector: credentials.accountSid as string,
        privateKey: credentials.secretKey as string,
      },
    };

    this.provider = new NodemailerProvider(config);
  }
}
