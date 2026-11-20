import { EmailProviderIdEnum } from '@novu/shared';

export function resolveAgentEmailIpPoolName(providerId: string): string {
  return providerId === EmailProviderIdEnum.AgentEmailInbox ? 'Agentinbox' : 'Demo';
}
