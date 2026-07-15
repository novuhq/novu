import { ToolProviderIdEnum } from '@novu/shared';
import { safeOutboundJsonRequest } from '@novu/shared/utils/safe-outbound-http';
import { ChannelTypeEnum, ISendMessageSuccessResponse, IToolOptions, IToolProvider } from '@novu/stateless';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export type OpsgenieRegion = 'us' | 'eu';
type OpsgeniePriority = 'P1' | 'P2' | 'P3' | 'P4' | 'P5';

// Opsgenie Alert API v2 endpoints per region.
// Docs: https://docs.opsgenie.com/docs/alert-api
const OPSGENIE_ENDPOINTS: Record<OpsgenieRegion, string> = {
  us: 'https://api.opsgenie.com/v2/alerts',
  eu: 'https://api.eu.opsgenie.com/v2/alerts',
};

// Opsgenie enforces a 130-character limit on the `message` field.
const MESSAGE_MAX_LENGTH = 130;

const RESERVED_OVERRIDE_KEYS = new Set([
  'content',
  'message',
  'alias',
  'description',
  'source',
  'entity',
  'user',
  'note',
  'priority',
  'tags',
  'responders',
  'visibleTo',
  'details',
]);

export class OpsgenieProvider extends BaseProvider implements IToolProvider {
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;
  readonly id = ToolProviderIdEnum.Opsgenie;
  channelType = ChannelTypeEnum.TOOL as ChannelTypeEnum.TOOL;

  constructor(
    private config: {
      apiKey: string;
      region: OpsgenieRegion;
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

    const overrides = data.body;
    const content = overrides.content as string;

    const message = this.truncateMessage((overrides.message as string) || content);
    const payload: Record<string, unknown> = { message };

    const optionalStringFields = ['alias', 'description', 'source', 'entity', 'user', 'note'] as const;
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

    const details = this.buildDetails(overrides);
    if (details) {
      payload.details = details;
    }

    const response = await safeOutboundJsonRequest<{ requestId?: string; result?: string }>({
      url: OPSGENIE_ENDPOINTS[this.config.region],
      method: 'POST',
      headers: {
        Authorization: `GenieKey ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return {
      id: response.body?.requestId,
      date: new Date().toDateString(),
    };
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
