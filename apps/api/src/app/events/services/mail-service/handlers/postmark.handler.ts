import { ChannelTypeEnum } from '@novu/shared';
import { ICredentials } from '@novu/dal';
import { PostmarkEmailProvider, PostmarkConfig } from '@novu/postmark';
import { BaseHandler } from './base.handler';

export class PostmarkHandler extends BaseHandler {
  constructor() {
    super('postmark', ChannelTypeEnum.EMAIL);
  }
  buildProvider(credentials: ICredentials, from: string) {
    const config: PostmarkConfig = { from, apiKey: credentials.apiKey };

    this.provider = new PostmarkEmailProvider(config);
  }
}
