export type ChannelData = SlackChannelData | SlackUserData | WebhookData | PhoneData;

export const ENDPOINT_TYPES = {
  SLACK_CHANNEL: 'slack_channel',
  SLACK_USER: 'slack_user',
  WEBHOOK: 'webhook',
  PHONE: 'phone',
} as const;

export type ChannelEndpointType = (typeof ENDPOINT_TYPES)[keyof typeof ENDPOINT_TYPES];

export type ChannelEndpointByType = {
  [ENDPOINT_TYPES.SLACK_CHANNEL]: { channelId: string };
  [ENDPOINT_TYPES.SLACK_USER]: { userId: string };
  [ENDPOINT_TYPES.WEBHOOK]: { url: string; channel?: string };
  [ENDPOINT_TYPES.PHONE]: { phoneNumber: string };
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

export function isChannelDataOfType<T extends ChannelData['type']>(
  data: ChannelData,
  type: T
): data is Extract<ChannelData, { type: T }> {
  return data.type === type;
}
