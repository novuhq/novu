import {
  ChannelTypeEnum,
  IPushOptions,
  IPushProvider,
  ISendMessageSuccessResponse,
} from '@novu/stateless';
import crypto from 'crypto';
import axios from 'axios';

export class PushWebhookPushProvider implements IPushProvider {
  readonly id = 'push-webhook';
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;

  constructor(
    private config: {
      hmacSecretKey?: string;
      webhookUrl: string;
    }
  ) {}

  async sendMessage(
    options: IPushOptions
  ): Promise<ISendMessageSuccessResponse> {
    const { subscriber, step, payload, ...rest } = options;
    const bodyData = this.createBody({
      ...rest,
      payload: {
        ...payload,
        subscriber,
        step,
      },
    });
    const hmacValue = this.computeHmac(bodyData);

    const response = await axios.post(this.config.webhookUrl, bodyData, {
      headers: {
        'content-type': 'application/json',
        'X-Novu-Signature': hmacValue,
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
