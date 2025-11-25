export type ChannelData =
  | SlackChannelData
  | SlackUserData
  | WebhookData
  | PhoneData
  | MsTeamsChannelData
  | MsTeamsUserData;

export const ENDPOINT_TYPES = {
  SLACK_CHANNEL: 'slack_channel',
  SLACK_USER: 'slack_user',
  WEBHOOK: 'webhook',
  PHONE: 'phone',
  MS_TEAMS_CHANNEL: 'ms_teams_channel',
  MS_TEAMS_USER: 'ms_teams_user',
} as const;

export type ChannelEndpointType = (typeof ENDPOINT_TYPES)[keyof typeof ENDPOINT_TYPES];

export type ChannelEndpointByType = {
  [ENDPOINT_TYPES.SLACK_CHANNEL]: { channelId: string };
  [ENDPOINT_TYPES.SLACK_USER]: { userId: string };
  [ENDPOINT_TYPES.WEBHOOK]: { url: string; channel?: string };
  [ENDPOINT_TYPES.PHONE]: { phoneNumber: string };
  [ENDPOINT_TYPES.MS_TEAMS_CHANNEL]: { teamId: string; channelId: string };
  [ENDPOINT_TYPES.MS_TEAMS_USER]: { userId: string };
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
] as const;
