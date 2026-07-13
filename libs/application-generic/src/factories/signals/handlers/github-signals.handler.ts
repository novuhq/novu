import { GithubSignalsProvider } from '@novu/providers';
import { ICredentials, SignalsProviderIdEnum } from '@novu/shared';
import { ChannelTypeEnum } from '@novu/stateless';
import { BaseSignalsHandler } from './base.handler';

export class GithubSignalsHandler extends BaseSignalsHandler {
  constructor() {
    super(SignalsProviderIdEnum.GitHub, ChannelTypeEnum.SIGNALS);
  }

  buildProvider(credentials: ICredentials) {
    if (!credentials.token || !credentials.owner || !credentials.repo || !credentials.eventType) {
      throw new Error('Config is not valid for github signals provider');
    }

    this.provider = new GithubSignalsProvider({
      token: credentials.token,
      owner: credentials.owner,
      repo: credentials.repo,
      eventType: credentials.eventType,
    });
  }
}
