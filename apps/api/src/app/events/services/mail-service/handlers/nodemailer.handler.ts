import { ChannelTypeEnum } from '@novu/shared';
import { ICredentials } from '@novu/dal';
import { NodemailerProvider, NodemailerConfig } from '@novu/nodemailer';
import { BaseHandler } from './base.handler';

export class NodemailerHandler extends BaseHandler {
  constructor() {
    super('nodemailer', ChannelTypeEnum.EMAIL);
  }
  buildProvider(credentials: ICredentials, from: string) {
    const config: NodemailerConfig = {
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
