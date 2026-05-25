import {
  buildAgentSharedInbox,
  getSharedAgentDomain,
  isAgentSharedInboxEnabled,
  isValidAgentEmailSlugPrefix,
} from '@novu/application-generic';
import type { AgentEntity, AgentIntegrationEntity, IntegrationEntity } from '@novu/dal';
import { buildClaudePlatformAgentConsoleUrl, EmailProviderIdEnum, isClaudePlatformConsoleProvider, slugify } from '@novu/shared';

import type { AgentIntegrationResponseDto, AgentIntegrationSummaryDto, AgentResponseDto } from '../dtos';

/**
 * Minimal integration shape needed by the agent integration mapper to compute
 * the shared inbox address. Only NovuAgent links need `credentials`; for every
 * other provider the slug-related fields are ignored.
 */
type AgentIntegrationEmbeddedSource = Pick<
  IntegrationEntity,
  '_id' | 'identifier' | 'name' | 'providerId' | 'channel' | 'active'
> &
  Partial<Pick<IntegrationEntity, 'credentials'>>;

/**
 * Minimal agent shape needed to compute the shared inbox local-part. Only the
 * agent's id (the routing key) and slug fallback are required.
 */
type SharedInboxAgentContext = Pick<AgentEntity, '_id'> & Partial<Pick<AgentEntity, 'identifier' | 'name'>>;

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

/** Builds a deep link to the agent in the provider console, or `undefined` for unknown providers. */
function buildAgentConsoleUrl(
  providerId: string,
  externalAgentId: string,
  externalWorkspaceId: string | undefined
): string | undefined {
  if (!isClaudePlatformConsoleProvider(providerId)) {
    return undefined;
  }

  return buildClaudePlatformAgentConsoleUrl(externalAgentId, externalWorkspaceId);
}

export function toAgentResponse(agent: AgentEntity, hydration?: ManagedRuntimeHydration): AgentResponseDto {
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
    managedRuntime,
    _environmentId: agent._environmentId,
    _organizationId: agent._organizationId,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
  };
}

/**
 * Compute the synthetic Novu shared inbox address
 * (`{slug}-{inboxRoutingKey}@<shared-domain>`) for a NovuAgent email
 * integration link. Returns `undefined` when the cloud shared-inbox feature is
 * disabled, the provider is not NovuAgent, the shared domain isn't configured,
 * the slug can't be resolved, or the routing key is missing/invalid. The
 * result is deterministic given those inputs; the integration's `active` flag
 * controls routing, not addressability, so the address is exposed regardless
 * of toggle state so the dashboard can still display it while paused.
 */
function resolveSharedInboxAddress(
  agent: SharedInboxAgentContext,
  integration: AgentIntegrationEmbeddedSource
): string | undefined {
  if (integration.providerId !== EmailProviderIdEnum.NovuAgent) {
    return undefined;
  }

  if (!isAgentSharedInboxEnabled()) {
    return undefined;
  }

  try {
    getSharedAgentDomain();
  } catch {
    return undefined;
  }

  const rawSlug = integration.credentials?.emailSlugPrefix;
  const slug = rawSlug && isValidAgentEmailSlugPrefix(rawSlug) ? rawSlug : deriveFallbackSlug(agent);

  if (!slug) {
    return undefined;
  }

  const inboxRoutingKey = integration.credentials?.inboxRoutingKey;
  if (!inboxRoutingKey) {
    return undefined;
  }

  try {
    return buildAgentSharedInbox(slug, inboxRoutingKey);
  } catch {
    return undefined;
  }
}

function deriveFallbackSlug(agent: SharedInboxAgentContext): string | undefined {
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
  integration: AgentIntegrationEmbeddedSource,
  agent: SharedInboxAgentContext
): AgentIntegrationResponseDto {
  const sharedInboundAddress = resolveSharedInboxAddress(agent, integration);
  const defaultSenderName =
    integration.providerId === EmailProviderIdEnum.NovuAgent
      ? integration.credentials?.senderName || agent.name
      : undefined;

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
      sharedInboundAddress,
      defaultSenderName,
      sharedInboxDisabled:
        integration.providerId === EmailProviderIdEnum.NovuAgent
          ? Boolean(integration.credentials?.sharedInboxDisabled)
          : undefined,
    },
    _environmentId: link._environmentId,
    _organizationId: link._organizationId,
    connectedAt: link.connectedAt ?? null,
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
  };
}
