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
      from: string;
      senderName: string;
      password: string;
    } = {
      from: credentials.from,
      senderName: credentials.senderName,
      password: credentials.password,
    };
    this.provider = new Outlook365Provider(config);
  }
}
