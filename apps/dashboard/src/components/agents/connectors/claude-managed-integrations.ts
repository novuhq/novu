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

  // MongoDB ObjectId's first 4 bytes (8 hex chars) encode the creation timestamp,
  // so a lexicographic descending compare on `_id` yields newest-first ordering.
  // This ensures the most recently added credential is what `getPreferredClaudeManagedIntegration`
  // returns and what the connector dropdown surfaces at the top.
  return right._id.localeCompare(left._id);
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

export function partitionClaudeManagedIntegrations(integrations: IIntegration[]): {
  userIntegrations: IIntegration[];
  demoIntegrations: IIntegration[];
} {
  const userIntegrations: IIntegration[] = [];
  const demoIntegrations: IIntegration[] = [];

  for (const integration of integrations) {
    if (isDemoIntegration(integration.providerId)) {
      demoIntegrations.push(integration);
    } else {
      userIntegrations.push(integration);
    }
  }

  return { userIntegrations, demoIntegrations };
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
