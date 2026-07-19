import { ToolProviderIdEnum } from '@novu/shared';
import { safeOutboundJsonRequest } from '@novu/shared/utils/safe-outbound-http';
import {
  assertSafeOutboundUrl,
  normalizeOutboundHttpUrl,
  SsrfBlockedError,
} from '@novu/shared/utils/ssrf-url-validation';
import { ChannelTypeEnum, ISendMessageSuccessResponse, IToolOptions, IToolProvider } from '@novu/stateless';
import crypto from 'crypto';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

type ToolWebhookMethod = 'POST' | 'PUT' | 'PATCH';

export class ToolWebhookProvider extends BaseProvider implements IToolProvider {
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;
  readonly id = ToolProviderIdEnum.Webhook;
  channelType = ChannelTypeEnum.TOOL as ChannelTypeEnum.TOOL;

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
    options: IToolOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const data = this.transform(bridgeProviderData, {
      content: options.content,
      ...(options.customData || {}),
    });

    const hmacSecretKey = this.config.hmacSecretKey;

    const webhookUrl = normalizeOutboundHttpUrl(this.config.webhookUrl);
    if (!webhookUrl) {
      throw new Error('Tool webhook URL blocked: Invalid URL format.');
    }

    try {
      assertSafeOutboundUrl(webhookUrl);
    } catch (err) {
      if (err instanceof SsrfBlockedError) {
        throw new Error(`Tool webhook URL blocked: ${err.message}`);
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
        throw new Error(`Tool webhook URL blocked: ${err.message}`);
      }
      throw err;
    });

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(`Tool webhook request failed with status ${response.statusCode}`);
    }

    return {
      id: response.body?.id,
      date: new Date().toDateString(),
    };
  }

  private resolveMethod(method?: string): ToolWebhookMethod {
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
      throw new Error('Tool webhook body template must be valid JSON.');
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Tool webhook body template must be a JSON object.');
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
