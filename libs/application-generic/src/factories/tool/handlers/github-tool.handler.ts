import { GithubToolProvider } from '@novu/providers';
import { ICredentials, ToolProviderIdEnum } from '@novu/shared';
import { ChannelTypeEnum } from '@novu/stateless';
import { BaseToolHandler } from './base.handler';

export class GithubToolHandler extends BaseToolHandler {
  constructor() {
    super(ToolProviderIdEnum.GitHub, ChannelTypeEnum.TOOL);
  }

  buildProvider(credentials: ICredentials) {
    if (!credentials.token || !credentials.owner || !credentials.repo || !credentials.eventType) {
      throw new Error('Config is not valid for github tool provider');
    }

    this.provider = new GithubToolProvider({
      token: credentials.token,
      owner: credentials.owner,
      repo: credentials.repo,
      eventType: credentials.eventType,
    });
  }
}
