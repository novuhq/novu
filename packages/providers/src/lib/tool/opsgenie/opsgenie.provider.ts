import { TOOL_PROVIDER_OVERRIDE_KEYS, ToolProviderIdEnum } from '@novu/shared';
import { safeOutboundJsonRequest } from '@novu/shared/utils/safe-outbound-http';
import {
  ChannelTypeEnum,
  ENDPOINT_TYPES,
  ISendMessageSuccessResponse,
  IToolOptions,
  IToolProvider,
  isChannelDataOfType,
  OpsgenieRegion,
} from '@novu/stateless';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export type { OpsgenieRegion };
type OpsgeniePriority = 'P1' | 'P2' | 'P3' | 'P4' | 'P5';

// Opsgenie Alert API v2 endpoints per region.
// Docs: https://docs.opsgenie.com/docs/alert-api
const OPSGENIE_ENDPOINTS: Record<OpsgenieRegion, string> = {
  us: 'https://api.opsgenie.com/v2/alerts',
  eu: 'https://api.eu.opsgenie.com/v2/alerts',
};

// Opsgenie enforces a 130-character limit on the `message` field.
const MESSAGE_MAX_LENGTH = 130;

/**
 * Keys consumed by explicit Alert API mapping and therefore excluded from
 * details. Uses the shared override-key inventory plus provider-internal fields.
 * Explicitly mapped fields in sendMessage must stay a subset of
 * TOOL_PROVIDER_OVERRIDE_KEYS[Opsgenie] (enforced in opsgenie.provider.spec.ts).
 */
const RESERVED_OVERRIDE_KEYS = new Set<string>([
  'content',
  ...TOOL_PROVIDER_OVERRIDE_KEYS[ToolProviderIdEnum.Opsgenie],
]);

export class OpsgenieProvider extends BaseProvider implements IToolProvider {
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;
  readonly id = ToolProviderIdEnum.Opsgenie;
  channelType = ChannelTypeEnum.TOOL as ChannelTypeEnum.TOOL;

  async sendMessage(
    options: IToolOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const { apiKey, region } = this.resolveRouting(options);

    const data = this.transform(bridgeProviderData, {
      content: options.content,
      ...(options.customData || {}),
    });

    const overrides = data.body;
    const content = overrides.content as string;

    const message = this.truncateMessage((overrides.message as string) || content);
    const payload: Record<string, unknown> = { message };

    const alias = this.resolveAlias(overrides.alias, options);
    if (alias) {
      payload.alias = alias;
    }

    const optionalStringFields = ['description', 'source', 'entity', 'user', 'note'] as const;
    for (const field of optionalStringFields) {
      const value = overrides[field];
      if (typeof value === 'string' && value.length > 0) {
        payload[field] = value;
      }
    }

    const priority = this.resolvePriority(overrides.priority);
    if (priority) {
      payload.priority = priority;
    }

    if (Array.isArray(overrides.tags)) {
      payload.tags = overrides.tags;
    }

    if (Array.isArray(overrides.responders)) {
      payload.responders = overrides.responders;
    }

    if (Array.isArray(overrides.visibleTo)) {
      payload.visibleTo = overrides.visibleTo;
    }

    if (Array.isArray(overrides.actions)) {
      payload.actions = overrides.actions;
    }

    const details = this.buildDetails(overrides);
    if (details) {
      payload.details = details;
    }

    const response = await safeOutboundJsonRequest<{ requestId?: string; result?: string }>({
      url: OPSGENIE_ENDPOINTS[region],
      method: 'POST',
      headers: {
        Authorization: `GenieKey ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(`Opsgenie alert request failed with status ${response.statusCode}`);
    }

    return {
      id: response.body?.requestId,
      date: new Date().toDateString(),
    };
  }

  /**
   * Opsgenie is routed per subscriber. The API integration key + region live
   * on the resolved `channelData`. The provider is stateless and refuses to
   * send without them so a missing endpoint fails loudly at the send seam
   * rather than sending to a wrong or empty destination.
   */
  private resolveRouting(options: IToolOptions): { apiKey: string; region: OpsgenieRegion } {
    const { channelData } = options;

    if (!channelData || !isChannelDataOfType(channelData, ENDPOINT_TYPES.OPSGENIE_INTEGRATION)) {
      throw new Error('OpsgenieProvider requires channelData of type "opsgenie_integration" with apiKey and region');
    }

    const { apiKey, region } = channelData.endpoint;
    if (!apiKey || !(region in OPSGENIE_ENDPOINTS)) {
      throw new Error('OpsgenieProvider channelData.endpoint requires an apiKey and a supported region ("us" or "eu")');
    }

    return { apiKey, region };
  }

  /**
   * Deterministic default: `novu:<transactionId>:<subscriberId>:<stepId>`.
   * Stable across worker retries of the same job (idempotent trigger), unique
   * per trigger event so distinct alerts stay distinct. Author-supplied
   * `customData.alias` always wins. Falls back to omitting the field when IDs
   * are missing, letting Opsgenie deduplicate on message content.
   */
  private resolveAlias(override: unknown, options: IToolOptions): string | undefined {
    if (typeof override === 'string' && override.length > 0) {
      return override;
    }

    const { transactionId, subscriberId, stepId } = options;
    if (transactionId && subscriberId && stepId) {
      return `novu:${transactionId}:${subscriberId}:${stepId}`;
    }

    return undefined;
  }

  private resolvePriority(value: unknown): OpsgeniePriority | undefined {
    if (value === 'P1' || value === 'P2' || value === 'P3' || value === 'P4' || value === 'P5') {
      return value;
    }

    return undefined;
  }

  private truncateMessage(message: string): string {
    if (message.length <= MESSAGE_MAX_LENGTH) {
      return message;
    }

    return `${message.slice(0, MESSAGE_MAX_LENGTH - 1)}…`;
  }

  private buildDetails(overrides: Record<string, unknown>): Record<string, unknown> | undefined {
    const extras: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(overrides)) {
      if (!RESERVED_OVERRIDE_KEYS.has(key)) {
        extras[key] = value;
      }
    }

    const explicit =
      overrides.details && typeof overrides.details === 'object' && !Array.isArray(overrides.details)
        ? (overrides.details as Record<string, unknown>)
        : {};

    const merged = { ...extras, ...explicit };

    if (Object.keys(merged).length === 0) {
      return undefined;
    }

    return merged;
  }
}
