import { ChannelTypeEnum } from '@novu/shared';
import { ICredentials } from '@novu/dal';
import { NodemailerProvider } from '@novu/nodemailer';
import { BaseHandler } from './base.handler';

export class NodemailerHandler extends BaseHandler {
  constructor() {
    super('nodemailer', ChannelTypeEnum.EMAIL);
  }
  buildProvider(credentials: ICredentials, from: string) {
    const config: {
      from: string;
      host: string;
      port: number;
      secure: boolean;
      user: string;
      password: string;
    } = {
      from,
      host: credentials.host,
      port: Number(credentials.port),
      secure: credentials.secure,
      user: credentials.user,
      password: credentials.password,
    };

    this.provider = new NodemailerProvider(config);
  }
}
