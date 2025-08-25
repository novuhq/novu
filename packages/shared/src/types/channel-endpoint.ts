import { ChatProviderIdEnum } from './providers';

export type SlackRouting = {
  type: ChatProviderIdEnum.Slack;
  channelId?: string;
  userId?: string;
};

export type ChannelEndpointRouting = SlackRouting;
