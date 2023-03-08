import { ChannelTypeEnum } from '@novu/shared';
import { KannelSmsProvider } from '@novu/kannel';
import { ICredentials } from '@novu/dal';
import { BaseSmsHandler } from './base.handler';

export class KannelSmsHandler extends BaseSmsHandler {
  constructor() {
    super('kannel', ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    const config: {
      host: string;
      port: string;
      from: string;
      username?: string;
      password?: string;
    } = {
      host: credentials.host || '',
      port: credentials.port || '',
      from: credentials.from || '',
      username: credentials.user,
      password: credentials.password,
    };

    this.provider = new KannelSmsProvider(config);
  }
}
