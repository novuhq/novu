import { ToolProviderIdEnum } from '@novu/shared';
import { safeOutboundJsonRequest } from '@novu/shared/utils/safe-outbound-http';
import {
  ChannelTypeEnum,
  ENDPOINT_TYPES,
  ISendMessageSuccessResponse,
  IToolOptions,
  IToolProvider,
  isChannelDataOfType,
  PagerDutyRegion,
} from '@novu/stateless';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export type { PagerDutyRegion };
type PagerDutyEventAction = 'trigger' | 'acknowledge' | 'resolve';
type PagerDutySeverity = 'critical' | 'error' | 'warning' | 'info';

// PagerDuty Events API v2 endpoints per region.
// Integration key setup: https://support.pagerduty.com/main/docs/services-and-integrations
const PAGERDUTY_ENDPOINTS: Record<PagerDutyRegion, string> = {
  us: 'https://events.pagerduty.com/v2/enqueue',
  eu: 'https://events.eu.pagerduty.com/v2/enqueue',
};

const DEFAULT_SEVERITY: PagerDutySeverity = 'critical';
const DEFAULT_SOURCE = 'novu';
// PagerDuty enforces a 1024-character limit on payload.summary.
const SUMMARY_MAX_LENGTH = 1024;

const RESERVED_OVERRIDE_KEYS = new Set([
  'content',
  'summary',
  'source',
  'severity',
  'event_action',
  'dedup_key',
  'custom_details',
  'routing_key',
]);

export class PagerDutyProvider extends BaseProvider implements IToolProvider {
  protected casing: CasingEnum = CasingEnum.SNAKE_CASE;
  readonly id = ToolProviderIdEnum.PagerDuty;
  channelType = ChannelTypeEnum.TOOL as ChannelTypeEnum.TOOL;

  async sendMessage(
    options: IToolOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const { routingKey, region } = this.resolveRouting(options);

    const data = this.transform(bridgeProviderData, {
      content: options.content,
      ...(options.customData || {}),
    });

    const overrides = data.body;
    const content = overrides.content as string;

    const eventAction = this.resolveEventAction(overrides.event_action);
    const severity = this.resolveSeverity(overrides.severity);
    const source = (overrides.source as string) || DEFAULT_SOURCE;
    const summary = this.truncateSummary((overrides.summary as string) || content);
    const dedupKey = this.resolveDedupKey(overrides.dedup_key, options);
    const customDetails = this.extractCustomDetails(overrides);

    const payload = {
      routing_key: routingKey,
      event_action: eventAction,
      ...(dedupKey ? { dedup_key: dedupKey } : {}),
      payload: {
        summary,
        source,
        severity,
        ...(Object.keys(customDetails).length > 0 ? { custom_details: customDetails } : {}),
      },
    };

    // PagerDuty Events API v2 authenticates via routing_key in the body; passthrough headers are not used.
    const response = await safeOutboundJsonRequest<{ dedup_key?: string; message?: string; status?: string }>({
      url: PAGERDUTY_ENDPOINTS[region],
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return {
      id: response.body?.dedup_key,
      date: new Date().toDateString(),
    };
  }

  /**
   * PagerDuty is routed per subscriber. The routing key + region live on the
   * resolved `channelData`. The provider is stateless and refuses to send
   * without them so a missing endpoint fails loudly at the send seam rather
   * than sending to a wrong or empty destination.
   */
  private resolveRouting(options: IToolOptions): { routingKey: string; region: PagerDutyRegion } {
    const { channelData } = options;

    if (!channelData || !isChannelDataOfType(channelData, ENDPOINT_TYPES.PAGERDUTY_SERVICE)) {
      throw new Error('PagerDutyProvider requires channelData of type "pagerduty_service" with routingKey and region');
    }

    const { routingKey, region } = channelData.endpoint;
    if (!routingKey || !region) {
      throw new Error('PagerDutyProvider channelData.endpoint is missing routingKey or region');
    }

    return { routingKey, region };
  }

  /**
   * Deterministic default: `novu:<transactionId>:<subscriberId>:<stepId>`.
   * Stable across worker retries of the same job (idempotent trigger), unique
   * per trigger event so distinct alerts stay distinct. Author-supplied
   * `customData.dedup_key` always wins. Falls back to omitting the field when
   * IDs are missing, letting PagerDuty generate one.
   */
  private resolveDedupKey(override: unknown, options: IToolOptions): string | undefined {
    if (typeof override === 'string' && override.length > 0) {
      return override;
    }

    const { transactionId, subscriberId, stepId } = options;
    if (transactionId && subscriberId && stepId) {
      return `novu:${transactionId}:${subscriberId}:${stepId}`;
    }

    return undefined;
  }

  private resolveEventAction(value: unknown): PagerDutyEventAction {
    if (value === 'acknowledge' || value === 'resolve' || value === 'trigger') {
      return value;
    }

    return 'trigger';
  }

  private resolveSeverity(value: unknown): PagerDutySeverity {
    if (value === 'error' || value === 'warning' || value === 'info' || value === 'critical') {
      return value;
    }

    return DEFAULT_SEVERITY;
  }

  private truncateSummary(summary: string): string {
    if (summary.length <= SUMMARY_MAX_LENGTH) {
      return summary;
    }

    return `${summary.slice(0, SUMMARY_MAX_LENGTH - 1)}…`;
  }

  private extractCustomDetails(overrides: Record<string, unknown>): Record<string, unknown> {
    const extras: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(overrides)) {
      if (!RESERVED_OVERRIDE_KEYS.has(key)) {
        extras[key] = value;
      }
    }

    const explicit =
      overrides.custom_details &&
      typeof overrides.custom_details === 'object' &&
      !Array.isArray(overrides.custom_details)
        ? (overrides.custom_details as Record<string, unknown>)
        : {};

    return { ...extras, ...explicit };
  }
}
