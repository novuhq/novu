import type { AgentIntegrationLink } from '../api/agents';
import { addAgentIntegration, listAgentIntegrations } from '../api/agents';
import type { ConnectApiClient } from '../api/client';
import { NovuApiError } from '../api/client';
import type { IntegrationRecord } from '../api/integrations';
import { listIntegrations } from '../api/integrations';
import type { AgentSummary } from '../types';
import { pollUntil } from './poll-until';

export type IntegrationResolver = (
  client: ConnectApiClient,
  input: { name: string; environmentId: string }
) => Promise<IntegrationRecord>;

export type ProviderMatch = {
  providerId: string;
  channel?: string;
  create: IntegrationResolver;
};

/**
 * Reuse an integration already linked to the agent, or create a fresh
 * agent-branded integration. Each agent gets its own provider app/bot.
 */
export async function resolveIntegrationForAgent(
  client: ConnectApiClient,
  agent: AgentSummary,
  environmentId: string,
  match: ProviderMatch
): Promise<IntegrationRecord> {
  const links = await listAgentIntegrations(client, agent.identifier);
  const alreadyLinked = links.find(
    (l) =>
      l.integration.providerId === match.providerId &&
      (match.channel === undefined || l.integration.channel === match.channel) &&
      l.integration.active !== false
  );
  if (alreadyLinked) {
    const integrations = await listIntegrations(client);
    const integration = integrations.find((i) => i.identifier === alreadyLinked.integration.identifier);
    if (integration) return integration;
  }

  return match.create(client, { name: agent.name, environmentId });
}

/** Ensure the agent↔integration link exists; 409 duplicate is a no-op. */
export async function ensureAgentIntegrationLinked(
  client: ConnectApiClient,
  agentIdentifier: string,
  integrationIdentifier: string
): Promise<AgentIntegrationLink | undefined> {
  const links = await listAgentIntegrations(client, agentIdentifier, { integrationIdentifier });
  const existingLink = links[0];
  if (existingLink) return existingLink;

  try {
    await addAgentIntegration(client, agentIdentifier, integrationIdentifier);
  } catch (err) {
    if (!(err instanceof NovuApiError) || err.status !== 409) throw err;
  }

  return undefined;
}

/** Poll until `connectedAt` is set on the agent↔integration link (first inbound message). */
export async function pollForAgentLinkConnected(
  client: ConnectApiClient,
  agentIdentifier: string,
  integrationIdentifier: string,
  options: { intervalMs: number; timeoutMs: number }
): Promise<boolean> {
  return pollUntil(async () => {
    const links = await listAgentIntegrations(client, agentIdentifier, { integrationIdentifier, limit: 1 });
    const link = links[0];

    return link?.connectedAt ? 'done' : 'pending';
  }, options);
}
