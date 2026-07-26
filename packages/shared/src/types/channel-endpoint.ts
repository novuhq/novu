import { ChannelTypeEnum } from './channel';
import { EnvironmentId } from './environment';
import { OrganizationId } from './organization';
import { ProvidersIdEnum } from './providers';

export const ENDPOINT_TYPES = {
  SLACK_CHANNEL: 'slack_channel',
  SLACK_USER: 'slack_user',
  WEBHOOK: 'webhook',
  PHONE: 'phone',
  MS_TEAMS_CHANNEL: 'ms_teams_channel',
  MS_TEAMS_USER: 'ms_teams_user',
  TELEGRAM_CHAT: 'telegram_chat',
  WEBEX_ROOM: 'webex_room',
  WEBEX_PERSON: 'webex_person',
  LINE_USER: 'line_user',
  PAGERDUTY_SERVICE: 'pagerduty_service',
  OPSGENIE_INTEGRATION: 'opsgenie_integration',
  TOOL_WEBHOOK: 'tool_webhook',
} as const;

export type ChannelEndpointType = (typeof ENDPOINT_TYPES)[keyof typeof ENDPOINT_TYPES];

export type ChannelEndpointByType = {
  [ENDPOINT_TYPES.SLACK_CHANNEL]: { channelId: string };
  [ENDPOINT_TYPES.SLACK_USER]: { userId: string };
  [ENDPOINT_TYPES.WEBHOOK]: { url: string; channel?: string };
  [ENDPOINT_TYPES.PHONE]: { phoneNumber: string };
  [ENDPOINT_TYPES.MS_TEAMS_CHANNEL]: { teamId: string; channelId: string };
  /**
   * `tenantId` is the Azure AD tenant the user belongs to. For multi-tenant distribution this can
   * differ from the bot's home tenant (the customer's tenant), and is used to scope Graph/Bot
   * Framework calls when delivering to that user. Optional for backward compatibility.
   */
  [ENDPOINT_TYPES.MS_TEAMS_USER]: { userId: string; tenantId?: string };
  [ENDPOINT_TYPES.TELEGRAM_CHAT]: { chatId: string };
  [ENDPOINT_TYPES.WEBEX_ROOM]: { roomId: string; parentId?: string };
  [ENDPOINT_TYPES.WEBEX_PERSON]: { personId: string; personEmail?: never } | { personId?: never; personEmail: string };
  [ENDPOINT_TYPES.LINE_USER]: { userId: string };
  /**
   * PagerDuty per-subscriber routing. `routingKey` is the 32-character PagerDuty
   * Events API v2 integration key; `region` selects the US/EU data-center endpoint.
   *
   * At the API boundary this is the wire shape on both writes and reads. Internally,
   * `routingKey` is persisted encrypted on `ChannelEndpoint.endpoint`; `region`
   * stays plaintext. No `ChannelConnection` is involved (connections are OAuth-only).
   */
  [ENDPOINT_TYPES.PAGERDUTY_SERVICE]: { routingKey: string; region: 'us' | 'eu' };
  /**
   * Opsgenie per-subscriber routing. `apiKey` is the UUID-format GenieKey issued by an
   * Opsgenie API integration; `region` selects the US/EU Alert API endpoint.
   *
   * At the API boundary this is the wire shape on both writes and reads. Internally,
   * `apiKey` is persisted encrypted on `ChannelEndpoint.endpoint`; `region` stays
   * plaintext. No `ChannelConnection` is involved (connections are OAuth-only).
   */
  [ENDPOINT_TYPES.OPSGENIE_INTEGRATION]: { apiKey: string; region: 'us' | 'eu' };
  /**
   * Tool-webhook per-subscriber routing. `url` is the destination (often a
   * capability URL); `headers` may carry auth tokens; `method` optionally
   * overrides the integration-level HTTP method.
   *
   * At the API boundary this is the wire shape on both writes and reads. Internally,
   * `url` and header values are persisted encrypted on `ChannelEndpoint.endpoint`;
   * `method` stays plaintext. No `ChannelConnection` is involved (connections are
   * OAuth-only).
   */
  [ENDPOINT_TYPES.TOOL_WEBHOOK]: {
    url: string;
    headers?: Record<string, string>;
    method?: 'POST' | 'PUT' | 'PATCH';
  };
};

/** Opsgenie GenieKey wire shape: 8-4-4-4-12 segments; segments may include non-hex letters. */
export const OPSGENIE_API_KEY_PATTERN = /^[a-zA-Z0-9]{8}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{12}$/;

export function isValidOpsgenieApiKey(value: string): boolean {
  return OPSGENIE_API_KEY_PATTERN.test(value);
}

export type ChannelEndpoint<T extends ChannelEndpointType = ChannelEndpointType> = {
  identifier: string;
  _organizationId: OrganizationId;
  _environmentId: EnvironmentId;

  connectionIdentifier?: string; // used for oauth providers with tenant-like flows
  integrationIdentifier: string;

  providerId: ProvidersIdEnum;
  channel: ChannelTypeEnum;
  subscriberId: string;
  contextKeys: string[];
  type: T;
  endpoint: ChannelEndpointByType[T];

  createdAt: string;
  updatedAt: string;
};
