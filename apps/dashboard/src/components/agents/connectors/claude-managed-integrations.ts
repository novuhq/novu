import { AgentRuntimeProviderIdEnum, type IIntegration, IntegrationKindEnum } from '@novu/shared';

const CLAUDE_MANAGED_PROVIDER_IDS: ReadonlySet<string> = new Set([
  AgentRuntimeProviderIdEnum.NovuAnthropic,
  AgentRuntimeProviderIdEnum.Anthropic,
]);

export function isClaudeManagedAgentIntegration(integration: IIntegration): boolean {
  if (integration.kind !== IntegrationKindEnum.AGENT) {
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

export function getClaudeManagedAgentIntegrations(integrations: IIntegration[] | undefined): IIntegration[] {
  return (integrations ?? []).filter(isClaudeManagedAgentIntegration).sort((left, right) => {
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
  integrations: IIntegration[] | undefined
): IIntegration | undefined {
  return getClaudeManagedAgentIntegrations(integrations)[0];
}

export function resolveClaudeManagedProviderId(integration: IIntegration | undefined): AgentRuntimeProviderIdEnum {
  if (integration?.providerId === AgentRuntimeProviderIdEnum.NovuAnthropic) {
    return AgentRuntimeProviderIdEnum.NovuAnthropic;
  }

  return AgentRuntimeProviderIdEnum.Anthropic;
}
