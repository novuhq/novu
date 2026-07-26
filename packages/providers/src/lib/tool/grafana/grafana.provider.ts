import { TOOL_PROVIDER_OVERRIDE_KEYS, ToolProviderIdEnum } from '@novu/shared';
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
} from '@novu/stateless';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

type GrafanaAlertState = 'alerting' | 'ok';

const DEFAULT_STATE: GrafanaAlertState = 'alerting';
// Grafana documents no hard limit on the formatted-webhook title; cap defensively.
const TITLE_MAX_LENGTH = 1024;

const OPTIONAL_STRING_FIELDS = ['link_to_upstream_details', 'image_url'] as const;

/**
 * Keys consumed by explicit Formatted Webhook mapping. Extras pass through
 * top-level in the JSON body (Grafana keeps the raw payload accessible to alert
 * templates). Mapped field lists must stay a subset of
 * TOOL_PROVIDER_OVERRIDE_KEYS[Grafana] (enforced in grafana.provider.spec.ts).
 */
const RESERVED_OVERRIDE_KEYS = new Set<string>([
  'content',
  'url',
  'authToken',
  ...TOOL_PROVIDER_OVERRIDE_KEYS[ToolProviderIdEnum.Grafana],
]);

export class GrafanaProvider extends BaseProvider implements IToolProvider {
  protected casing: CasingEnum = CasingEnum.SNAKE_CASE;
  readonly id = ToolProviderIdEnum.Grafana;
  channelType = ChannelTypeEnum.TOOL as ChannelTypeEnum.TOOL;

  async sendMessage(
    options: IToolOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const { url, authToken } = this.resolveRouting(options);

    const data = this.transform(bridgeProviderData, {
      content: options.content,
      ...(options.customData || {}),
    });

    const overrides = data.body;
    const content = overrides.content as string;

    const message = (overrides.message as string) || content;
    const title = this.truncateTitle((overrides.title as string) || content);
    const state = this.resolveState(overrides.state);
    const alertUid = this.resolveAlertUid(overrides.alert_uid, options);

    // Extras first so explicit mappings always win on key collisions.
    const body: Record<string, unknown> = {
      ...this.extractExtras(overrides),
      title,
      message,
      state,
      ...(alertUid ? { alert_uid: alertUid } : {}),
    };
    for (const field of OPTIONAL_STRING_FIELDS) {
      const value = overrides[field];
      if (typeof value === 'string' && value.length > 0) {
        body[field] = value;
      }
    }

    const webhookUrl = this.resolveSafeWebhookUrl(url);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await safeOutboundJsonRequest({
      url: webhookUrl,
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }).catch((err: unknown) => {
      if (err instanceof SsrfBlockedError) {
        throw new Error(`Grafana webhook URL blocked: ${err.message}`);
      }
      throw err;
    });

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(`Grafana webhook request failed with status ${response.statusCode}`);
    }

    return {
      id: alertUid,
      date: new Date().toDateString(),
    };
  }

  /** Require per-subscriber channelData routing; fail closed if missing. */
  private resolveRouting(options: IToolOptions): { url: string; authToken?: string } {
    const { channelData } = options;

    if (!channelData || !isChannelDataOfType(channelData, ENDPOINT_TYPES.GRAFANA_ONCALL_INTEGRATION)) {
      throw new Error('GrafanaProvider requires channelData of type "grafana_oncall_integration" with a webhook url');
    }

    const { url, authToken } = channelData.endpoint;
    if (!url) {
      throw new Error('GrafanaProvider channelData.endpoint is missing url');
    }

    return { url, authToken };
  }

  /** The webhook URL is subscriber-supplied data; apply the same SSRF guard as tool-webhook. */
  private resolveSafeWebhookUrl(url: string): string {
    const webhookUrl = normalizeOutboundHttpUrl(url);
    if (!webhookUrl) {
      throw new Error('Grafana webhook URL blocked: Invalid URL format.');
    }

    try {
      assertSafeOutboundUrl(webhookUrl);
    } catch (err) {
      if (err instanceof SsrfBlockedError) {
        throw new Error(`Grafana webhook URL blocked: ${err.message}`);
      }
      throw err;
    }

    return webhookUrl;
  }

  /**
   * Deterministic default: `novu:<transactionId>:<subscriberId>:<stepId>`.
   * Stable across worker retries of the same job (idempotent trigger) so
   * retries group into the same alert, and a later `state: "ok"` send with the
   * same uid auto-resolves it. Author-supplied `alert_uid` always wins.
   */
  private resolveAlertUid(override: unknown, options: IToolOptions): string | undefined {
    if (typeof override === 'string' && override.length > 0) {
      return override;
    }

    const { transactionId, subscriberId, stepId } = options;
    if (transactionId && subscriberId && stepId) {
      return `novu:${transactionId}:${subscriberId}:${stepId}`;
    }

    return undefined;
  }

  private resolveState(value: unknown): GrafanaAlertState {
    if (value === 'ok' || value === 'alerting') {
      return value;
    }

    return DEFAULT_STATE;
  }

  private truncateTitle(title: string): string {
    if (title.length <= TITLE_MAX_LENGTH) {
      return title;
    }

    return `${title.slice(0, TITLE_MAX_LENGTH - 1)}…`;
  }

  /** Non-reserved override keys pass through top-level for Grafana alert templates. */
  private extractExtras(overrides: Record<string, unknown>): Record<string, unknown> {
    const extras: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(overrides)) {
      if (!RESERVED_OVERRIDE_KEYS.has(key)) {
        extras[key] = value;
      }
    }

    return extras;
  }
}
