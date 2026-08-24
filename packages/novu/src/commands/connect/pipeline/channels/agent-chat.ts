import { buildConnectAgentChatDashboardUrl } from '@novu/shared';
import { CONNECT_EVENTS } from '../../analytics/events';
import { addAgentChatIntegration } from '../../api/agents';
import type { ConnectApiClient } from '../../api/client';
import { NovuApiError } from '../../api/client';
import type { IntegrationRecord } from '../../api/integrations';
import type { ResolvedConnectAuth } from '../../auth/resolve-connect-auth';
import type { AgentSummary, ConnectAgentChatHandoff, ConnectCommandOptions } from '../../types';
import { logAgentChatDashboardUrlHandoffEvent } from '../../ui/handoff-events';
import type { ConnectUI } from '../../ui/ui';

export async function connectAgentChatForAgent(
  client: ConnectApiClient,
  agent: AgentSummary,
  ui: ConnectUI,
  options: ConnectCommandOptions,
  auth: ResolvedConnectAuth,
  track: (event: string, data?: Record<string, unknown>) => void
): Promise<{
  integration: IntegrationRecord;
  handoff: ConnectAgentChatHandoff;
}> {
  ui.addingAgentChatIntegration();

  let link;
  try {
    link = await addAgentChatIntegration(client, agent.identifier);
  } catch (err) {
    throw normalizeAgentChatProvisionError(err);
  }

  const integration: IntegrationRecord = {
    _id: link.integration._id,
    identifier: link.integration.identifier,
    name: link.integration.name,
    providerId: link.integration.providerId,
    channel: 'chat',
    active: link.integration.active !== false,
  };

  track(CONNECT_EVENTS.AGENT_CHAT_LINKED, {
    agent: agent.identifier,
    alreadyLinked: Boolean(link.connectedAt),
  });

  const dashboardUrl = buildConnectAgentChatDashboardUrl({
    connectDashboardUrl: options.connectDashboardUrl,
    environmentSlug: auth.environmentSlug ?? null,
    agentIdentifier: agent.identifier,
  });

  const handoff: ConnectAgentChatHandoff = {
    dashboardUrl,
    embedPrompt: '',
  };

  await ui.awaitAgentChatHandoff({
    dashboardUrl,
    embedPrompt: handoff.embedPrompt,
  });

  if (!ui.interactive) {
    logAgentChatDashboardUrlHandoffEvent({ dashboardUrl });
  }

  return { integration, handoff };
}

function normalizeAgentChatProvisionError(err: unknown): Error {
  if (err instanceof NovuApiError && err.status === 403) {
    return new Error(err.message);
  }

  return err instanceof Error ? err : new Error(String(err));
}
