import { PushProviderIdEnum } from '@novu/shared';
import { safeOutboundJsonRequest } from '@novu/shared/utils/safe-outbound-http';
import {
  assertSafeOutboundUrl,
  normalizeOutboundHttpUrl,
  SsrfBlockedError,
} from '@novu/shared/utils/ssrf-url-validation';
import { ChannelTypeEnum, IPushOptions, IPushProvider, ISendMessageSuccessResponse } from '@novu/stateless';
import crypto from 'crypto';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class PushWebhookPushProvider extends BaseProvider implements IPushProvider {
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;
  readonly id = PushProviderIdEnum.PushWebhook;
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;

  constructor(
    private config: {
      hmacSecretKey?: string;
      webhookUrl: string;
    }
  ) {
    super();
  }

  async sendMessage(
    options: IPushOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
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

    const hmacSecretKey = (data.body.hmacSecretKey as string) || this.config.hmacSecretKey;
    const webhookUrlRaw = (data.body.webhookUrl as string) || this.config.webhookUrl;

    // Clean up override fields from the body before sending
    if (data.body.hmacSecretKey) {
      delete data.body.hmacSecretKey;
    }
    if (data.body.webhookUrl) {
      delete data.body.webhookUrl;
    }

    const webhookUrl = normalizeOutboundHttpUrl(webhookUrlRaw);
    if (!webhookUrl) {
      throw new Error('Push webhook URL blocked: Invalid URL format.');
    }

    // Validate the destination before computing the HMAC, so a blocked URL
    // never sees the signed payload. The connect-time DNS guard and redirect
    // re-validation happen inside safeOutboundJsonRequest.
    try {
      assertSafeOutboundUrl(webhookUrl);
    } catch (err) {
      if (err instanceof SsrfBlockedError) {
        throw new Error(`Push webhook URL blocked: ${err.message}`);
      }
      throw err;
    }

    const body = this.createBody(data.body);
    const hmacValue = this.computeHmac(body, hmacSecretKey);

    const response = await safeOutboundJsonRequest<{ id: string }>({
      url: webhookUrl,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Novu-Signature': hmacValue,
        ...data.headers,
      },
      body,
    }).catch((err: unknown) => {
      if (err instanceof SsrfBlockedError) {
        throw new Error(`Push webhook URL blocked: ${err.message}`);
      }
      throw err;
    });

    return {
      id: response.body?.id,
      date: new Date().toDateString(),
    };
  }

  createBody(options: object): string {
    return JSON.stringify(options);
  }

  computeHmac(payload: string, hmacSecretKey: string): string {
    const secretKey = hmacSecretKey;

    return crypto.createHmac('sha256', secretKey).update(payload, 'utf-8').digest('hex');
  }
}
