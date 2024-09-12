import { PushProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  IPushOptions,
  IPushProvider,
  ISendMessageSuccessResponse,
} from '@novu/stateless';
import apn from '@parse/node-apn';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class APNSPushProvider extends BaseProvider implements IPushProvider {
  id = PushProviderIdEnum.APNS;
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;

  protected keyCaseObject: Record<string, string> = {
    contentAvailable: 'content-available',
    launchImage: 'launch-image',
    mutableContent: 'mutable-content',
    urlArgs: 'url-args',
    titleLocKey: 'title-loc-key',
    titleLocArgs: 'title-loc-args',
    actionLocKey: 'action-loc-key',
    locKey: 'loc-key',
    locArgs: 'loc-args',
  };

  private provider: apn.Provider;
  constructor(
    private config: {
      key: string;
      keyId: string;
      teamId: string;
      bundleId: string;
      production: boolean;
    },
  ) {
    super();
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
    options: IPushOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    // eslint-disable-next-line no-param-reassign
    delete (options.overrides as any)?.notificationIdentifiers;
    const notification = new apn.Notification(
      this.transform(bridgeProviderData, {
        body: options.content,
        title: options.title,
        payload: options.payload,
        topic: this.config.bundleId,
        ...options.overrides,
      }).body,
    );
    const res = await this.provider.send(notification, options.target);

    if (res.failed.length > 0) {
      throw new Error(
        res.failed
          .map(
            (failed) =>
              `${failed.device} failed for reason: ${failed.response.reason}`,
          )
          .join(','),
      );
    }

    this.provider.shutdown();

    return {
      ids: res.sent?.map((response) => response.device),
      date: new Date().toISOString(),
    };
  }
}
