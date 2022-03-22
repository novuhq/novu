import { ChannelTypeEnum } from '@notifire/shared';
import { ICredentials } from '@notifire/dal';
import { PostmarkEmailProvider } from '@notifire/postmark';
import { BaseHandler } from './base.handler';

export class PostmarkHandler extends BaseHandler {
  constructor() {
    super('postmark', ChannelTypeEnum.EMAIL);
  }
  buildProvider(credentials: ICredentials, from: string) {
    const config: { apiKey: string; from: string } = { from, apiKey: credentials.apiKey };

    this.provider = new PostmarkEmailProvider(config);
  }
}
