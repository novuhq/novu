import { AgentRuntimeProviderIdEnum } from '@novu/shared';
import type { IntegrationRecord } from './integrations';

const AGENT_INTEGRATION_KIND = 'agent' as const;

export function findActiveDemoAgentIntegration(integrations: IntegrationRecord[]): IntegrationRecord | undefined {
  return integrations.find(
    (integration) =>
      integration.providerId === AgentRuntimeProviderIdEnum.NovuAnthropic &&
      integration.kind === AGENT_INTEGRATION_KIND &&
      integration.active !== false
  );
}

export function hasActiveDemoAgentIntegration(integrations: IntegrationRecord[]): boolean {
  return findActiveDemoAgentIntegration(integrations) !== undefined;
}
