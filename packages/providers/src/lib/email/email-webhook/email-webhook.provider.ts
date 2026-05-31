import crypto from 'node:crypto';
import { EmailProviderIdEnum } from '@novu/shared';
import { safeOutboundJsonRequest } from '@novu/shared/utils/safe-outbound-http';
import {
  assertSafeOutboundUrl,
  normalizeOutboundHttpUrl,
  SsrfBlockedError,
} from '@novu/shared/utils/ssrf-url-validation';
import {
  ChannelTypeEnum,
  CheckIntegrationResponseEnum,
  ICheckIntegrationResponse,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
} from '@novu/stateless';
import { setTimeout } from 'node:timers/promises';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class EmailWebhookProvider extends BaseProvider implements IEmailProvider {
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;
  readonly id = EmailProviderIdEnum.EmailWebhook;
  readonly channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;

  constructor(
    private config: {
      hmacSecretKey?: string;
      webhookUrl: string;
      retryCount?: number;
      retryDelay?: number;
    }
  ) {
    super();
    this.config.retryDelay ??= 30 * 1000;
    this.config.retryCount ??= 3;
  }

  async checkIntegration(options: IEmailOptions): Promise<ICheckIntegrationResponse> {
    return {
      success: true,
      message: 'Integrated successfully!',
      code: CheckIntegrationResponseEnum.SUCCESS,
    };
  }

  async sendMessage(
    options: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const transformedData = this.transform(bridgeProviderData, options);
    const webhookUrl = normalizeOutboundHttpUrl(this.config.webhookUrl);

    if (!webhookUrl) {
      throw new Error('Email webhook URL blocked: Invalid URL format.');
    }

    try {
      assertSafeOutboundUrl(webhookUrl);
    } catch (err) {
      if (err instanceof SsrfBlockedError) {
        throw new Error(`Email webhook URL blocked: ${err.message}`);
      }
      throw err;
    }

    const bodyData = this.createBody(transformedData.body);
    const hmacValue = this.computeHmac(bodyData);
    let sent = false;

    for (let retries = 0; !sent && retries < this.config.retryCount; retries += 1) {
      try {
        await safeOutboundJsonRequest({
          url: webhookUrl,
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'X-Novu-Signature': hmacValue,
            ...transformedData.headers,
          },
          body: bodyData,
        }).catch((err: unknown) => {
          if (err instanceof SsrfBlockedError) {
            throw new Error(`Email webhook URL blocked: ${err.message}`);
          }
          throw err;
        });
        sent = true;
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('Email webhook URL blocked')) {
          throw error;
        }
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
    return crypto.createHmac('sha256', this.config.hmacSecretKey).update(payload, 'utf-8').digest('hex');
  }
}
