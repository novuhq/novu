import { ChannelTypeEnum } from '@novu/shared';
import { ListmonkEmailProvider } from '@novu/listmonkEmail';
import { BaseHandler } from './base.handler';

export class ListmonkEmailHandler extends BaseHandler {
  constructor() {
    super('listmonkEmail', ChannelTypeEnum.EMAIL);
  }

  buildProvider(credentials) {
    const config: {
      host: string;
      port: string;
      username: string;
      password: string;
      templateId: number;
    } = {
      host: credentials.host,
      port: credentials.port,
      username: credentials.user,
      password: credentials.password,
      templateId: Number(credentials.applicationId),
    };

    this.provider = new ListmonkEmailProvider(config);
  }
}
