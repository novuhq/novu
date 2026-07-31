export type ChannelData =
  | SlackChannelData
  | SlackUserData
  | WebhookData
  | PhoneData
  | MsTeamsChannelData
  | MsTeamsUserData
  | TelegramChatData
  | WebexRoomData
  | WebexPersonData
  | LineUserData
  | PagerDutyServiceData
  | OpsgenieIntegrationData
  | GrafanaOnCallIntegrationData
  | ToolWebhookData;

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
  GRAFANA_ONCALL_INTEGRATION: 'grafana_oncall_integration',
  TOOL_WEBHOOK: 'tool_webhook',
} as const;

export type ChannelEndpointType = (typeof ENDPOINT_TYPES)[keyof typeof ENDPOINT_TYPES];

export type ChannelEndpointByType = {
  [ENDPOINT_TYPES.SLACK_CHANNEL]: { channelId: string };
  [ENDPOINT_TYPES.SLACK_USER]: { userId: string };
  [ENDPOINT_TYPES.WEBHOOK]: { url: string; channel?: string };
  [ENDPOINT_TYPES.PHONE]: { phoneNumber: string };
  [ENDPOINT_TYPES.MS_TEAMS_CHANNEL]: { teamId: string; channelId: string };
  [ENDPOINT_TYPES.MS_TEAMS_USER]: { userId: string };
  [ENDPOINT_TYPES.TELEGRAM_CHAT]: { chatId: string };
  [ENDPOINT_TYPES.WEBEX_ROOM]: { roomId: string; parentId?: string };
  [ENDPOINT_TYPES.WEBEX_PERSON]: { personId: string; personEmail?: never } | { personId?: never; personEmail: string };
  [ENDPOINT_TYPES.LINE_USER]: { userId: string };
  [ENDPOINT_TYPES.PAGERDUTY_SERVICE]: { routingKey: string; region: 'us' | 'eu' };
  [ENDPOINT_TYPES.OPSGENIE_INTEGRATION]: { apiKey: string; region: 'us' | 'eu' };
  [ENDPOINT_TYPES.GRAFANA_ONCALL_INTEGRATION]: { url: string; authToken?: string };
  [ENDPOINT_TYPES.TOOL_WEBHOOK]: {
    url: string;
    headers?: Record<string, string>;
    method?: 'POST' | 'PUT' | 'PATCH';
  };
};

export type SlackChannelData = {
  type: typeof ENDPOINT_TYPES.SLACK_CHANNEL;
  endpoint: ChannelEndpointByType[typeof ENDPOINT_TYPES.SLACK_CHANNEL];
  token: string; // OAuth/Bot token required to send
  identifier: string;
};

export type SlackUserData = {
  type: typeof ENDPOINT_TYPES.SLACK_USER;
  endpoint: ChannelEndpointByType[typeof ENDPOINT_TYPES.SLACK_USER];
  token: string; // OAuth/Bot token required to send
  identifier: string;
};

export type WebhookData = {
  type: typeof ENDPOINT_TYPES.WEBHOOK;
  endpoint: ChannelEndpointByType[typeof ENDPOINT_TYPES.WEBHOOK];
  identifier: string;
};

export type PhoneData = {
  type: typeof ENDPOINT_TYPES.PHONE;
  endpoint: ChannelEndpointByType[typeof ENDPOINT_TYPES.PHONE];
  identifier: string;
};

export type TelegramChatData = {
  type: typeof ENDPOINT_TYPES.TELEGRAM_CHAT;
  endpoint: ChannelEndpointByType[typeof ENDPOINT_TYPES.TELEGRAM_CHAT];
  identifier: string;
};

export type WebexRoomData = {
  type: typeof ENDPOINT_TYPES.WEBEX_ROOM;
  endpoint: ChannelEndpointByType[typeof ENDPOINT_TYPES.WEBEX_ROOM];
  token: string;
  identifier: string;
};

export type WebexPersonData = {
  type: typeof ENDPOINT_TYPES.WEBEX_PERSON;
  endpoint: ChannelEndpointByType[typeof ENDPOINT_TYPES.WEBEX_PERSON];
  token: string;
  identifier: string;
};

export type LineUserData = {
  type: typeof ENDPOINT_TYPES.LINE_USER;
  endpoint: ChannelEndpointByType[typeof ENDPOINT_TYPES.LINE_USER];
  identifier: string;
};

export type MsTeamsChannelData = {
  type: typeof ENDPOINT_TYPES.MS_TEAMS_CHANNEL;
  endpoint: ChannelEndpointByType[typeof ENDPOINT_TYPES.MS_TEAMS_CHANNEL];
  identifier: string;
  subscriberTenantId: string;
  token: string;
};

export type MsTeamsUserData = {
  type: typeof ENDPOINT_TYPES.MS_TEAMS_USER;
  endpoint: ChannelEndpointByType[typeof ENDPOINT_TYPES.MS_TEAMS_USER];
  identifier: string;
  subscriberTenantId: string;
  token: string;
  clientId: string;
};

export type PagerDutyRegion = 'us' | 'eu';

/**
 * Per-subscriber PagerDuty routing resolved at send time. The resolver hydrates
 * `endpoint` from the linked `ChannelConnection.auth` (which stores the routing
 * key encrypted at rest); at send time the provider destructures directly off
 * `endpoint`, matching the wire shape on write/read.
 */
export type PagerDutyServiceData = {
  type: typeof ENDPOINT_TYPES.PAGERDUTY_SERVICE;
  endpoint: ChannelEndpointByType[typeof ENDPOINT_TYPES.PAGERDUTY_SERVICE];
  identifier: string;
};

export type OpsgenieRegion = 'us' | 'eu';

/**
 * Per-subscriber Opsgenie routing resolved at send time. The resolver hydrates
 * `endpoint` from the linked `ChannelConnection.auth` (which stores the API
 * key encrypted at rest); at send time the provider destructures directly off
 * `endpoint`, matching the wire shape on write/read.
 */
export type OpsgenieIntegrationData = {
  type: typeof ENDPOINT_TYPES.OPSGENIE_INTEGRATION;
  endpoint: ChannelEndpointByType[typeof ENDPOINT_TYPES.OPSGENIE_INTEGRATION];
  identifier: string;
};

/**
 * Per-subscriber Grafana routing resolved at send time. The resolver decrypts
 * `endpoint` from `ChannelEndpoint.endpoint` (which stores the webhook URL and
 * optional bearer token encrypted at rest); at send time the provider
 * destructures directly off `endpoint`, matching the wire shape on write/read.
 */
export type GrafanaOnCallIntegrationData = {
  type: typeof ENDPOINT_TYPES.GRAFANA_ONCALL_INTEGRATION;
  endpoint: ChannelEndpointByType[typeof ENDPOINT_TYPES.GRAFANA_ONCALL_INTEGRATION];
  identifier: string;
};

/**
 * Per-subscriber tool-webhook routing resolved at send time. The resolver
 * hydrates `endpoint` from the linked `ChannelConnection.auth` (which stores
 * url/headers/method encrypted at rest); at send time the provider
 * destructures directly off `endpoint`, matching the wire shape on write/read.
 */
export type ToolWebhookData = {
  type: typeof ENDPOINT_TYPES.TOOL_WEBHOOK;
  endpoint: ChannelEndpointByType[typeof ENDPOINT_TYPES.TOOL_WEBHOOK];
  identifier: string;
};

export function isChannelDataOfType<T extends ChannelData['type']>(
  data: ChannelData,
  type: T
): data is Extract<ChannelData, { type: T }> {
  return data.type === type;
}

export const ENDPOINT_TYPES_REQUIRING_TOKEN = [
  ENDPOINT_TYPES.SLACK_CHANNEL,
  ENDPOINT_TYPES.SLACK_USER,
  ENDPOINT_TYPES.MS_TEAMS_CHANNEL,
  ENDPOINT_TYPES.MS_TEAMS_USER,
  ENDPOINT_TYPES.WEBEX_ROOM,
  ENDPOINT_TYPES.WEBEX_PERSON,
  ENDPOINT_TYPES.PAGERDUTY_SERVICE,
  ENDPOINT_TYPES.OPSGENIE_INTEGRATION,
  ENDPOINT_TYPES.GRAFANA_ONCALL_INTEGRATION,
  ENDPOINT_TYPES.TOOL_WEBHOOK,
] as const;
