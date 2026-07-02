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
};

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
