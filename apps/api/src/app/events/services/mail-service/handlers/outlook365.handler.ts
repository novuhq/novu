import { ChannelTypeEnum } from '@novu/shared';
import { ICredentials } from '@novu/dal';
import { Outlook365Provider } from '@novu/outlook365';
import { BaseHandler } from './base.handler';

export class Outlook365Handler extends BaseHandler {
  constructor() {
    super('outlook365', ChannelTypeEnum.EMAIL);
  }

  buildProvider(credentials: ICredentials) {
    const config: {
      user: string;
      password: string;
    } = {
      user: credentials.user,
      password: credentials.password,
    };

    this.provider = new Outlook365Provider(config);
  }
}
