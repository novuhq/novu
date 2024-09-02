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
import { EmailProviderIdEnum } from '@novu/shared';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class EmailWebhookProvider
  extends BaseProvider
  implements IEmailProvider
{
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;
  readonly id = EmailProviderIdEnum.EmailWebhook;
  readonly channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;

  constructor(
    private config: {
      hmacSecretKey?: string;
      webhookUrl: string;
      retryCount?: number;
      retryDelay?: number;
    },
  ) {
    super();
    this.config.retryDelay ??= 30 * 1000;
    this.config.retryCount ??= 3;
  }

  async checkIntegration(
    options: IEmailOptions,
  ): Promise<ICheckIntegrationResponse> {
    return {
      success: true,
      message: 'Integrated successfully!',
      code: CheckIntegrationResponseEnum.SUCCESS,
    };
  }

  async sendMessage(
    options: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const transformedData = this.transform(bridgeProviderData, options);
    const bodyData = this.createBody(transformedData.body);
    const hmacValue = this.computeHmac(bodyData);
    let sent = false;

    for (
      let retries = 0;
      !sent && retries < this.config.retryCount;
      retries += 1
    ) {
      try {
        await axios.create().post(this.config.webhookUrl, bodyData, {
          headers: {
            'content-type': 'application/json',
            'X-Novu-Signature': hmacValue,
            ...transformedData.headers,
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

  createBody(options: WithPassthrough<Record<string, unknown>>): string {
    return JSON.stringify(options);
  }

  computeHmac(payload: string): string {
    return crypto
      .createHmac('sha256', this.config.hmacSecretKey)
      .update(payload, 'utf-8')
      .digest('hex');
  }
}
