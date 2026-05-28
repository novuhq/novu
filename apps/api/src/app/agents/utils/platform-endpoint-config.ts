import { ChannelEndpointType, ENDPOINT_TYPES } from '@novu/shared';
import { AgentPlatformEnum } from '../dtos/agent-platform.enum';

interface PlatformEndpointMapping {
  endpointType: ChannelEndpointType;
  identityField: string;
}

export const PLATFORM_ENDPOINT_CONFIG: Partial<Record<AgentPlatformEnum, PlatformEndpointMapping>> = {
  [AgentPlatformEnum.SLACK]: {
    endpointType: ENDPOINT_TYPES.SLACK_USER,
    identityField: 'userId',
  },
  [AgentPlatformEnum.TEAMS]: {
    endpointType: ENDPOINT_TYPES.MS_TEAMS_USER,
    identityField: 'userId',
  },
  // Telegram subscriber resolution is DM-only: for 1:1 chats with the bot,
  // Telegram's chat.id equals the sender's user.id, so the chatId stored on
  // telegram_chat endpoints is also the value of message.author.userId on inbound.
  [AgentPlatformEnum.TELEGRAM]: {
    endpointType: ENDPOINT_TYPES.TELEGRAM_CHAT,
    identityField: 'chatId',
  },
};
