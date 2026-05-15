import { buildAgentSharedInbox, getSharedAgentDomain, isAgentSharedInboxEnabled, isValidAgentEmailSlugPrefix } from '@novu/application-generic';
import type { AgentEntity, AgentIntegrationEntity, IntegrationEntity } from '@novu/dal';
import { AgentRuntimeProviderIdEnum, EmailProviderIdEnum, slugify } from '@novu/shared';

import type { AgentIntegrationResponseDto, AgentIntegrationSummaryDto, AgentResponseDto } from '../dtos';

/**
 * The NovuAgent email integration shape needed to compute the agent's shared
 * inbox address. We accept a minimal `Pick` so call sites that already have
 * the integration in memory can pass it without an extra query.
 */
export type NovuAgentEmailHydration = Pick<IntegrationEntity, '_id' | 'providerId' | 'channel' | 'active' | 'credentials'>;

export type ManagedRuntimeHydration = {
  /** Provider-side environment id (decrypted from the linked integration credentials). */
  externalEnvironmentId?: string;
  /**
   * Provider-side workspace id used in console deep links.
   * For Anthropic this is `"default"` for the auto-created Default Workspace,
   * or a `wrkspc_…` id for custom workspaces.
   */
  externalWorkspaceId?: string;
};

/** Default Claude workspace id — every Anthropic org has an auto-created Default Workspace addressed as `default`. */
const DEFAULT_CLAUDE_WORKSPACE_ID = 'default';

/** Builds a deep link to the agent in the provider console, or `undefined` for unknown providers. */
function buildAgentConsoleUrl(
  providerId: string,
  externalAgentId: string,
  externalWorkspaceId: string | undefined
): string | undefined {
  if (providerId === AgentRuntimeProviderIdEnum.Anthropic) {
    const workspaceId = encodeURIComponent(externalWorkspaceId?.trim() || DEFAULT_CLAUDE_WORKSPACE_ID);

    return `https://platform.claude.com/workspaces/${workspaceId}/agents/${encodeURIComponent(externalAgentId)}`;
  }

  return undefined;
}

export function toAgentResponse(
  agent: AgentEntity,
  hydration?: ManagedRuntimeHydration,
  emailIntegration?: NovuAgentEmailHydration | null
): AgentResponseDto {
  const managedRuntime = agent.managedRuntime
    ? {
        providerId: agent.managedRuntime.providerId,
        integrationId: agent.managedRuntime._integrationId,
        externalAgentId: agent.managedRuntime.externalAgentId,
        externalEnvironmentId: hydration?.externalEnvironmentId,
        externalWorkspaceId: hydration?.externalWorkspaceId,
        consoleUrl: buildAgentConsoleUrl(
          agent.managedRuntime.providerId,
          agent.managedRuntime.externalAgentId,
          hydration?.externalWorkspaceId
        ),
      }
    : undefined;

  const sharedInbox = resolveSharedInbox(agent, emailIntegration);

  return {
    _id: agent._id,
    name: agent.name,
    identifier: agent.identifier,
    description: agent.description,
    active: agent.active,
    behavior: agent.behavior,
    bridgeUrl: agent.bridgeUrl,
    devBridgeUrl: agent.devBridgeUrl,
    devBridgeActive: agent.devBridgeActive,
    runtime: agent.runtime,
    creationSource: agent.creationSource,
    managedRuntime,
    defaultInboundAddress: sharedInbox.address,
    defaultDomain: sharedInbox.domain,
    _environmentId: agent._environmentId,
    _organizationId: agent._organizationId,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
  };
}

/**
 * Compute the agent's default shared inbox address (`{slug}-{_id}@<shared-domain>`).
 *
 * Returns undefined for both `address` and `domain` when:
 *   - the cloud shared-inbox feature is disabled, OR
 *   - the NovuAgent email integration is missing, OR
 *   - the integration is inactive (per-agent kill switch off)
 *
 * `address` may still be undefined when the feature is enabled but the slug is
 * missing (legacy rows). The dashboard handles that case by falling back to
 * showing the agent identifier as a hint.
 */
function resolveSharedInbox(
  agent: AgentEntity,
  emailIntegration: NovuAgentEmailHydration | null | undefined
): { address?: string; domain?: string } {
  if (!isAgentSharedInboxEnabled()) {
    return {};
  }

  let domain: string;
  try {
    domain = getSharedAgentDomain();
  } catch {
    return {};
  }

  if (!emailIntegration || emailIntegration.providerId !== EmailProviderIdEnum.NovuAgent || emailIntegration.active === false) {
    return { domain };
  }

  const rawSlug = emailIntegration.credentials?.emailSlugPrefix;
  const slug = rawSlug && isValidAgentEmailSlugPrefix(rawSlug) ? rawSlug : deriveFallbackSlug(agent);

  if (!slug) {
    return { domain };
  }

  try {
    return { address: buildAgentSharedInbox(slug, agent._id), domain };
  } catch {
    return { domain };
  }
}

function deriveFallbackSlug(agent: AgentEntity): string | undefined {
  const candidate = slugify(agent.identifier ?? agent.name ?? '')
    .slice(0, 32)
    .replace(/^-+/, '')
    .replace(/-+$/, '');

  return isValidAgentEmailSlugPrefix(candidate) ? candidate : undefined;
}

export function toAgentIntegrationSummary(
  integration: Pick<IntegrationEntity, '_id' | 'identifier' | 'name' | 'providerId' | 'channel' | 'active'>
): AgentIntegrationSummaryDto {
  return {
    integrationId: integration._id,
    providerId: integration.providerId,
    name: integration.name,
    identifier: integration.identifier,
    channel: integration.channel,
    active: integration.active,
  };
}

export function toAgentIntegrationResponse(
  link: AgentIntegrationEntity,
  integration: Pick<IntegrationEntity, '_id' | 'identifier' | 'name' | 'providerId' | 'channel' | 'active'>
): AgentIntegrationResponseDto {
  return {
    _id: link._id,
    _agentId: link._agentId,
    integration: {
      _id: integration._id,
      identifier: integration.identifier,
      name: integration.name,
      providerId: integration.providerId,
      channel: integration.channel,
      active: integration.active,
    },
    _environmentId: link._environmentId,
    _organizationId: link._organizationId,
    connectedAt: link.connectedAt ?? null,
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
  };
}
