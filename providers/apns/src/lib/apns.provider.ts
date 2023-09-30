import {
  ChannelTypeEnum,
  IPushOptions,
  IPushProvider,
  ISendMessageSuccessResponse,
} from '@novu/stateless';
import apn from '@parse/node-apn';

export class APNSPushProvider implements IPushProvider {
  id = 'apns';
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;

  private provider: apn.Provider;
  constructor(
    private config: {
      key: string;
      keyId: string;
      teamId: string;
      bundleId: string;
      production: boolean;
    }
  ) {
    this.config = config;
    this.provider = new apn.Provider({
      token: {
        key: config.key,
        keyId: config.keyId,
        teamId: config.teamId,
      },
      production: config.production,
    });
  }

  async sendMessage(
    options: IPushOptions
  ): Promise<ISendMessageSuccessResponse> {
    delete (options.overrides as any)?.notificationIdentifiers;
    const notification = new apn.Notification({
      body: options.content,
      title: options.title,
      payload: options.payload,
      topic: this.config.bundleId,
      ...options.overrides,
    });
    const res = await this.provider.send(notification, options.target);

    if (res.failed.length > 0) {
      throw new Error(
        res.failed
          .map(
            (failed) =>
              `${failed.device} failed for reason: ${failed.response.reason}`
          )
          .join(',')
      );
    }

    this.provider.shutdown();

    return {
      ids: res.sent?.map((response) => response.device),
      date: new Date().toISOString(),
    };
  }
}
