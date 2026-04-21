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
  [AgentPlatformEnum.WHATSAPP]: {
    endpointType: ENDPOINT_TYPES.PHONE,
    identityField: 'phoneNumber',
  },
};
