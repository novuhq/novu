import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IEmailOptions,
  IEmailProvider,
  ICheckIntegrationResponse,
  CheckIntegrationResponseEnum,
} from '@novu/stateless';

import crypto from 'crypto';
import axios from 'axios';
import { setTimeout } from 'timers/promises';

export class EmailWebhookProvider implements IEmailProvider {
  readonly id = 'email-webhook';
  readonly channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;

  constructor(
    private config: {
      hmacSecretKey?: string;
      webhookUrl: string;
      retryCount?: number;
      retryDelay?: number;
    }
  ) {
    this.config.retryDelay ??= 30 * 1000;
    this.config.retryCount ??= 3;
  }

  async checkIntegration(
    options: IEmailOptions
  ): Promise<ICheckIntegrationResponse> {
    return {
      success: true,
      message: 'Integrated successfully!',
      code: CheckIntegrationResponseEnum.SUCCESS,
    };
  }

  async sendMessage(
    options: IEmailOptions
  ): Promise<ISendMessageSuccessResponse> {
    const bodyData = this.createBody(options);
    const hmacValue = this.computeHmac(bodyData);
    let sent = false;

    for (
      let retries = 0;
      !sent && retries < this.config.retryCount;
      retries++
    ) {
      try {
        await axios.post(this.config.webhookUrl, bodyData, {
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
      id: options.id,
      date: new Date().toDateString(),
    };
  }

  createBody(options: IEmailOptions): string {
    return JSON.stringify(options);
  }

  computeHmac(payload: string): string {
    return crypto
      .createHmac('sha256', this.config.hmacSecretKey)
      .update(payload, 'utf-8')
      .digest('hex');
  }
}
