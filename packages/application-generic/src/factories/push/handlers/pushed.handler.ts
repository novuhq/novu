import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { PushedPushProvider } from '@novu/pushed';
import { BasePushHandler } from './base.handler';

export class PushedHandler extends BasePushHandler {
  constructor() {
    super('pushed', ChannelTypeEnum.PUSH);
  }

  buildProvider(credentials: ICredentials) {
    let pushedConfig: IPushedConfig;

    if (credentials.targetAlias) {
      pushedConfig = {
        appKey: credentials.appKey,
        appSecret: credentials.appSecret,
        targetAlias: credentials.targetAlias,
      };
    } else if (credentials.apiKey) {
      pushedConfig = {
        apiKey: credentials.apiKey,
      };
    } else if (credentials.accessToken) {
      pushedConfig = {
        accessToken: credentials.accessToken,
      };
    } else {
      throw new Error('No valid credentials provided for Pushed');
    }

    this.provider = new PushedPushProvider(pushedConfig);
  }
}

interface IPushedConfig {
  appKey?: string;
  appSecret?: string;
  targetAlias?: string;
  apiKey?: string;
  accessToken?: string;
}
