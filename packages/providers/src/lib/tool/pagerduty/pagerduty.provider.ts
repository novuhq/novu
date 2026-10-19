import { TOOL_PROVIDER_OVERRIDE_KEYS, ToolProviderIdEnum } from '@novu/shared';
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

const PAYLOAD_OPTIONAL_STRING_FIELDS = ['timestamp', 'component', 'group', 'class'] as const;
const ROOT_OPTIONAL_STRING_FIELDS = ['client', 'client_url'] as const;
const ROOT_OPTIONAL_ARRAY_FIELDS = ['links', 'images'] as const;

/**
 * Keys consumed by explicit Events API mapping and therefore excluded from
 * custom_details. Uses the shared override-key inventory plus provider-internal fields.
 * Mapped field lists above must stay a subset of TOOL_PROVIDER_OVERRIDE_KEYS[PagerDuty]
 * (enforced in pagerduty.provider.spec.ts).
 */
const RESERVED_OVERRIDE_KEYS = new Set<string>([
  'content',
  'routing_key',
  ...TOOL_PROVIDER_OVERRIDE_KEYS[ToolProviderIdEnum.PagerDuty],
]);

function assignNonEmptyStringFields(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  fields: readonly string[]
) {
  for (const field of fields) {
    const value = source[field];
    if (typeof value === 'string' && value.length > 0) {
      target[field] = value;
    }
  }
}

function assignArrayFields(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  fields: readonly string[]
) {
  for (const field of fields) {
    const value = source[field];
    if (Array.isArray(value)) {
      target[field] = value;
    }
  }
}

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

    const eventPayload: Record<string, unknown> = {
      summary,
      source,
      severity,
    };
    assignNonEmptyStringFields(eventPayload, overrides, PAYLOAD_OPTIONAL_STRING_FIELDS);

    if (Object.keys(customDetails).length > 0) {
      eventPayload.custom_details = customDetails;
    }

    const body: Record<string, unknown> = {
      routing_key: routingKey,
      event_action: eventAction,
      ...(dedupKey ? { dedup_key: dedupKey } : {}),
      payload: eventPayload,
    };
    assignNonEmptyStringFields(body, overrides, ROOT_OPTIONAL_STRING_FIELDS);
    assignArrayFields(body, overrides, ROOT_OPTIONAL_ARRAY_FIELDS);

    // PagerDuty Events API v2 authenticates via routing_key in the body; passthrough headers are not used.
    const response = await safeOutboundJsonRequest<{ dedup_key?: string; message?: string; status?: string }>({
      url: PAGERDUTY_ENDPOINTS[region],
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(`PagerDuty event request failed with status ${response.statusCode}`);
    }

    return {
      id: response.body?.dedup_key,
      date: new Date().toDateString(),
    };
  }

  /** Require per-subscriber channelData routing; fail closed if missing. */
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

  /** Prefer author `dedup_key`; else `novu:<transactionId>:<subscriberId>:<stepId>` for retry-stable dedup. */
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
