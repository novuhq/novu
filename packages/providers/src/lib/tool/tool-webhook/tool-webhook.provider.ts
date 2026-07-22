import crypto from 'node:crypto';
import { ToolProviderIdEnum } from '@novu/shared';
import { safeOutboundJsonRequest } from '@novu/shared/utils/safe-outbound-http';
import {
  assertSafeOutboundUrl,
  normalizeOutboundHttpUrl,
  SsrfBlockedError,
} from '@novu/shared/utils/ssrf-url-validation';
import {
  ChannelTypeEnum,
  ENDPOINT_TYPES,
  ISendMessageSuccessResponse,
  IToolOptions,
  IToolProvider,
  isChannelDataOfType,
  ToolWebhookData,
} from '@novu/stateless';
import { deepMerge } from '../../../utils/deepmerge.utils';
import { WithPassthrough } from '../../../utils/types';

type ToolWebhookMethod = 'POST' | 'PUT' | 'PATCH';

type ResolvedRouting = {
  url: string;
  method?: string;
  headers?: Record<string, string>;
};

export class ToolWebhookProvider implements IToolProvider {
  readonly id = ToolProviderIdEnum.Webhook;
  channelType = ChannelTypeEnum.TOOL as ChannelTypeEnum.TOOL;

  constructor(
    private config: {
      webhookUrl?: string;
      method?: string;
      headers?: Record<string, string>;
      bodyTemplate?: string;
      hmacSecretKey?: string;
    }
  ) {}

  async sendMessage(
    options: IToolOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const routing = this.resolveRouting(options);
    const { _passthrough = {}, ...providerOverride } = bridgeProviderData;
    const hasProviderOverride = Object.keys(providerOverride).length > 0;

    const defaultContent = hasProviderOverride ? {} : { content: options.content };
    const body = deepMerge<Record<string, unknown>>([
      defaultContent,
      providerOverride,
      options.customData || {},
      _passthrough.body || {},
    ]);

    const webhookUrl = normalizeOutboundHttpUrl(routing.url);
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

    const runtimeMethodOverride = body.method as string | undefined;
    if (body.method) {
      delete body.method;
    }

    const method = this.resolveMethod(runtimeMethodOverride || routing.method);
    const requestBody = this.resolveBody(body);
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      ...routing.headers,
      ..._passthrough.headers,
    };

    const hmacValue = this.computeHmac(requestBody, this.config.hmacSecretKey);
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

  /** Prefer tool_webhook channelData when present; otherwise use config.webhookUrl. */
  private resolveRouting(options: IToolOptions): ResolvedRouting {
    const { channelData } = options;

    if (channelData && isChannelDataOfType(channelData, ENDPOINT_TYPES.TOOL_WEBHOOK)) {
      return this.resolveDynamicRouting(channelData);
    }

    if (!this.config.webhookUrl) {
      throw new Error('Tool webhook URL is not configured.');
    }

    return {
      url: this.config.webhookUrl,
      method: this.config.method,
      headers: this.config.headers,
    };
  }

  /** Endpoint values override the integration config per key; endpoints never carry a body. */
  private resolveDynamicRouting(channelData: ToolWebhookData): ResolvedRouting {
    const { endpoint } = channelData;

    if (!endpoint?.url) {
      throw new Error('Tool webhook channelData.endpoint is missing url');
    }

    return {
      url: endpoint.url,
      method: endpoint.method || this.config.method,
      headers: {
        ...this.config.headers,
        ...endpoint.headers,
      },
    };
  }

  private resolveMethod(method?: string): ToolWebhookMethod {
    const normalized = (method || 'POST').toUpperCase();

    if (normalized === 'PUT' || normalized === 'PATCH' || normalized === 'POST') {
      return normalized;
    }

    return 'POST';
  }

  /** Parses the integration body template as a JSON object (KV base); transformed step keys win. */
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
      ...transformedBody,
    });
  }

  private computeHmac(payload: string, hmacSecretKey?: string): string | undefined {
    if (!hmacSecretKey) {
      return undefined;
    }

    return crypto.createHmac('sha256', hmacSecretKey).update(payload, 'utf-8').digest('hex');
  }
}
