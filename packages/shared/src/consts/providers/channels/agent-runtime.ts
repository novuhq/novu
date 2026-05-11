import { AgentRuntimeProviderIdEnum, ChannelTypeEnum } from '../../../types';
import { anthropicAgentConfig } from '../credentials';
import type { IProviderConfig } from '../provider.interface';

export const agentRuntimeProviders: IProviderConfig[] = [
  {
    id: AgentRuntimeProviderIdEnum.Anthropic,
    displayName: 'Claude (Anthropic)',
    channel: ChannelTypeEnum.AGENT_RUNTIME,
    credentials: anthropicAgentConfig,
    docReference: 'https://docs.anthropic.com/en/docs/agents',
    logoFileName: { light: 'anthropic.svg', dark: 'anthropic.svg' },
  },
];
