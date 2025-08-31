import { ChatProviderIdEnum } from './providers';

export type SlackRouting = {
  providerId: ChatProviderIdEnum.Slack;
  channelId?: string;
  userId?: string;
};

export type ChannelEndpointRouting = SlackRouting;
