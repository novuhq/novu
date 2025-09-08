export type ChannelData = SlackChannelData | SlackUserData | WebhookData | PhoneData;

export const ADDRESS_TYPES = {
  SLACK_CHANNEL: 'slack_channel',
  SLACK_USER: 'slack_user',
  WEBHOOK: 'webhook',
  PHONE: 'phone',
} as const;

export type ChannelAddressType = (typeof ADDRESS_TYPES)[keyof typeof ADDRESS_TYPES];

export type ChannelAddressByType = {
  [ADDRESS_TYPES.SLACK_CHANNEL]: { channelId: string };
  [ADDRESS_TYPES.SLACK_USER]: { userId: string };
  [ADDRESS_TYPES.WEBHOOK]: { url: string; channel?: string };
  [ADDRESS_TYPES.PHONE]: { phoneNumber: string };
};

export type SlackChannelData = {
  type: typeof ADDRESS_TYPES.SLACK_CHANNEL;
  address: ChannelAddressByType[typeof ADDRESS_TYPES.SLACK_CHANNEL];
  token: string; // OAuth/Bot token required to send
  identifier: string;
};

export type SlackUserData = {
  type: typeof ADDRESS_TYPES.SLACK_USER;
  address: ChannelAddressByType[typeof ADDRESS_TYPES.SLACK_USER];
  token: string; // OAuth/Bot token required to send
  identifier: string;
};

export type WebhookData = {
  type: typeof ADDRESS_TYPES.WEBHOOK;
  address: ChannelAddressByType[typeof ADDRESS_TYPES.WEBHOOK];
  identifier: string;
};

export type PhoneData = {
  type: typeof ADDRESS_TYPES.PHONE;
  address: ChannelAddressByType[typeof ADDRESS_TYPES.PHONE];
  identifier: string;
};

export function isChannelDataOfType<T extends ChannelData['type']>(
  data: ChannelData,
  type: T
): data is Extract<ChannelData, { type: T }> {
  return data.type === type;
}
