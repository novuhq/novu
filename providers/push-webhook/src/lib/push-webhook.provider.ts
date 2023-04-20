import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IPushOptions,
  IPushProvider,
} from '@novu/stateless';

import crypto from 'crypto';
import axios, { AxiosResponse } from 'axios';
import { setTimeout } from 'timers/promises';

export class PushWebhookPushProvider implements IPushProvider {
  readonly id = 'push-webhook';
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;

  constructor(
    private config: {
      hmacSecretKey?: string;
      webhookUrl: string;
      retryCount?: number;
      retryDelay?: number;
    }
  ) {}

  async sendMessage(
    options: IPushOptions
  ): Promise<ISendMessageSuccessResponse> {
    const bodyData = this.createBody(options);
    const hmacValue = this.computeHmac(bodyData);
    let sent = false;

    let response: undefined | AxiosResponse;

    for (
      let retries = 0;
      !sent && retries < this.config.retryCount;
      retries++
    ) {
      try {
        response = await axios.post(this.config.webhookUrl, bodyData, {
          headers: {
            'content-type': 'application/json',
            'X-Novu-Signature': hmacValue,
          },
        });
        sent = true;
      } catch (error) {
        await setTimeout(this.config.retryDelay);
      }
    }

    if (!sent) {
      throw new Error('webhook send failed !');
    }

    return {
      id: response.data.id,
      date: new Date().toDateString(),
    };
  }

  createBody(options: IPushOptions): string {
    return JSON.stringify(options);
  }

  computeHmac(payload: string): string {
    return crypto
      .createHmac('sha256', this.config.hmacSecretKey)
      .update(payload, 'utf-8')
      .digest('hex');
  }
}
