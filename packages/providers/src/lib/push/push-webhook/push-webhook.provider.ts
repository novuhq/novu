import {
  ChannelTypeEnum,
  IPushOptions,
  IPushProvider,
  ISendMessageSuccessResponse,
} from '@novu/stateless';
import crypto from 'crypto';
import axios from 'axios';
import { PushProviderIdEnum } from '@novu/shared';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class PushWebhookPushProvider
  extends BaseProvider
  implements IPushProvider
{
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;
  readonly id = PushProviderIdEnum.PushWebhook;
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;

  constructor(
    private config: {
      hmacSecretKey?: string;
      webhookUrl: string;
    },
  ) {
    super();
  }

  async sendMessage(
    options: IPushOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const { subscriber, step, payload, ...rest } = options;
    const data = this.transform(bridgeProviderData, {
      ...rest,
      payload: {
        ...payload,
        subscriber,
        step,
      },
    });
    const body = this.createBody(data.body);

    const hmacValue = this.computeHmac(body);

    const response = await axios.create().post(this.config.webhookUrl, body, {
      headers: {
        'content-type': 'application/json',
        'X-Novu-Signature': hmacValue,
        ...data.headers,
      },
    });

    return {
      id: response.data.id,
      date: new Date().toDateString(),
    };
  }

  createBody(options: object): string {
    return JSON.stringify(options);
  }

  computeHmac(payload: string): string {
    return crypto
      .createHmac('sha256', this.config.hmacSecretKey)
      .update(payload, 'utf-8')
      .digest('hex');
  }
}
