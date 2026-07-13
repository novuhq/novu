import { SignalsProviderIdEnum } from '@novu/shared';
import { safeOutboundJsonRequest } from '@novu/shared/utils/safe-outbound-http';
import {
  assertSafeOutboundUrl,
  normalizeOutboundHttpUrl,
  SsrfBlockedError,
} from '@novu/shared/utils/ssrf-url-validation';
import { ChannelTypeEnum, ISendMessageSuccessResponse, ISignalsOptions, ISignalsProvider } from '@novu/stateless';
import crypto from 'crypto';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

type SignalsWebhookMethod = 'POST' | 'PUT' | 'PATCH';

export class SignalsWebhookProvider extends BaseProvider implements ISignalsProvider {
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;
  readonly id = SignalsProviderIdEnum.Webhook;
  channelType = ChannelTypeEnum.SIGNALS as ChannelTypeEnum.SIGNALS;

  constructor(
    private config: {
      webhookUrl: string;
      method?: string;
      headers?: Record<string, string>;
      bodyTemplate?: string;
      hmacSecretKey?: string;
    }
  ) {
    super();
  }

  async sendMessage(
    options: ISignalsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const data = this.transform(bridgeProviderData, {
      content: options.content,
      ...(options.customData || {}),
    });

    const webhookUrlRaw = (data.body.webhookUrl as string) || this.config.webhookUrl;
    const hmacSecretKey = (data.body.hmacSecretKey as string) || this.config.hmacSecretKey;

    if (data.body.webhookUrl) {
      delete data.body.webhookUrl;
    }
    if (data.body.hmacSecretKey) {
      delete data.body.hmacSecretKey;
    }

    const webhookUrl = normalizeOutboundHttpUrl(webhookUrlRaw);
    if (!webhookUrl) {
      throw new Error('Signals webhook URL blocked: Invalid URL format.');
    }

    try {
      assertSafeOutboundUrl(webhookUrl);
    } catch (err) {
      if (err instanceof SsrfBlockedError) {
        throw new Error(`Signals webhook URL blocked: ${err.message}`);
      }
      throw err;
    }

    const method = this.resolveMethod((data.body.method as string) || this.config.method);
    if (data.body.method) {
      delete data.body.method;
    }

    const requestBody = this.resolveBody(data.body);
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      ...this.config.headers,
      ...data.headers,
    };

    const hmacValue = this.computeHmac(requestBody, hmacSecretKey);
    if (hmacValue) {
      headers['X-Novu-Signature'] = hmacValue;
    }

    const response = await safeOutboundJsonRequest<{ id: string }>({
      url: webhookUrl,
      method,
      headers,
      body: requestBody,
    }).catch((err: unknown) => {
      if (err instanceof SsrfBlockedError) {
        throw new Error(`Signals webhook URL blocked: ${err.message}`);
      }
      throw err;
    });

    return {
      id: response.body?.id,
      date: new Date().toDateString(),
    };
  }

  private resolveMethod(method?: string): SignalsWebhookMethod {
    const normalized = (method || 'POST').toUpperCase();

    if (normalized === 'PUT' || normalized === 'PATCH' || normalized === 'POST') {
      return normalized;
    }

    return 'POST';
  }

  private resolveBody(transformedBody: Record<string, unknown>): string {
    if (!this.config.bodyTemplate) {
      return JSON.stringify(transformedBody);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(this.config.bodyTemplate);
    } catch {
      throw new Error('Signals webhook body template must be valid JSON.');
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Signals webhook body template must be a JSON object.');
    }

    return JSON.stringify({
      ...(parsed as Record<string, unknown>),
      content: transformedBody.content,
    });
  }

  private computeHmac(payload: string, hmacSecretKey?: string): string | undefined {
    if (!hmacSecretKey) {
      return undefined;
    }

    return crypto.createHmac('sha256', hmacSecretKey).update(payload, 'utf-8').digest('hex');
  }
}
