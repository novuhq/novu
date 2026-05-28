import { AgentRuntimeProviderIdEnum, type IIntegration, IntegrationKindEnum } from '@novu/shared';
import { isDemoIntegration } from '@/components/integrations/components/utils/helpers';

function compareClaudeManagedIntegrations(left: IIntegration, right: IIntegration): number {
  const leftIsDemo = isDemoIntegration(left.providerId);
  const rightIsDemo = isDemoIntegration(right.providerId);

  if (leftIsDemo && !rightIsDemo) {
    return 1;
  }

  if (!leftIsDemo && rightIsDemo) {
    return -1;
  }

  return 0;
}

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

  if (providerId) {
    const matchesConnector =
      integration.providerId === providerId ||
      (providerId === AgentRuntimeProviderIdEnum.Anthropic &&
        integration.providerId === AgentRuntimeProviderIdEnum.NovuAnthropic);

    if (!matchesConnector) {
      return false;
    }
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
  return (integrations ?? [])
    .filter((integration) => isClaudeManagedAgentIntegration(integration, providerId))
    .sort(compareClaudeManagedIntegrations);
}

export function getPreferredClaudeManagedIntegration(
  integrations: IIntegration[] | undefined,
  providerId?: AgentRuntimeProviderIdEnum
): IIntegration | undefined {
  return getClaudeManagedAgentIntegrations(integrations, providerId)[0];
}

export function isDemoManagedClaudeIntegrationSelected(
  integrations: IIntegration[] | undefined,
  selectedIntegrationId: string | undefined
): boolean {
  if (!selectedIntegrationId) {
    return false;
  }

  const integration = (integrations ?? []).find((item) => item._id === selectedIntegrationId);

  if (!integration) {
    return false;
  }

  return isDemoIntegration(integration.providerId);
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
