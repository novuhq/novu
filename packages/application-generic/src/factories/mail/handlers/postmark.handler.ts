import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { PostmarkEmailProvider } from '@novu/providers';
import { BaseHandler } from './base.handler';

export class PostmarkHandler extends BaseHandler {
  constructor() {
    super('postmark', ChannelTypeEnum.EMAIL);
  }
  buildProvider(credentials: ICredentials, from?: string) {
    const config: { apiKey: string; from: string } = {
      from: from as string,
      apiKey: credentials.apiKey as string,
    };

    this.provider = new PostmarkEmailProvider(config);
  }
}
