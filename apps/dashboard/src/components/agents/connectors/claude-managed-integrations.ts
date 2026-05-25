import { AgentRuntimeProviderIdEnum, type IIntegration, IntegrationKindEnum } from '@novu/shared';

const CLAUDE_MANAGED_PROVIDER_IDS: ReadonlySet<string> = new Set([
  AgentRuntimeProviderIdEnum.NovuAnthropic,
  AgentRuntimeProviderIdEnum.Anthropic,
  AgentRuntimeProviderIdEnum.AnthropicAws,
]);

export function isClaudeManagedAgentIntegration(
  integration: IIntegration,
  providerId?: AgentRuntimeProviderIdEnum
): boolean {
  if (integration.kind !== IntegrationKindEnum.AGENT) {
    return false;
  }

  if (providerId && integration.providerId !== providerId) {
    return false;
  }

  if (!CLAUDE_MANAGED_PROVIDER_IDS.has(integration.providerId)) {
    return false;
  }

  if (integration.providerId === AgentRuntimeProviderIdEnum.NovuAnthropic && integration.active === false) {
    return false;
  }

  return true;
}

export function getClaudeManagedAgentIntegrations(
  integrations: IIntegration[] | undefined,
  providerId?: AgentRuntimeProviderIdEnum
): IIntegration[] {
  return (integrations ?? []).filter((integration) => isClaudeManagedAgentIntegration(integration, providerId)).sort((left, right) => {
    if (left.providerId === AgentRuntimeProviderIdEnum.NovuAnthropic) {
      return -1;
    }

    if (right.providerId === AgentRuntimeProviderIdEnum.NovuAnthropic) {
      return 1;
    }

    return 0;
  });
}

export function getPreferredClaudeManagedIntegration(
  integrations: IIntegration[] | undefined,
  providerId?: AgentRuntimeProviderIdEnum
): IIntegration | undefined {
  return getClaudeManagedAgentIntegrations(integrations, providerId)[0];
}

export function resolveClaudeManagedProviderId(integration: IIntegration | undefined): AgentRuntimeProviderIdEnum {
  if (integration?.providerId === AgentRuntimeProviderIdEnum.NovuAnthropic) {
    return AgentRuntimeProviderIdEnum.NovuAnthropic;
  }

  if (integration?.providerId === AgentRuntimeProviderIdEnum.AnthropicAws) {
    return AgentRuntimeProviderIdEnum.AnthropicAws;
  }

  return AgentRuntimeProviderIdEnum.Anthropic;
}
