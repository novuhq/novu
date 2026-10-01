import { buildConnectWebChatDashboardUrl } from '@novu/shared';
import { CONNECT_EVENTS } from '../../analytics/events';
import { addWebChatIntegration } from '../../api/agents';
import type { ConnectApiClient } from '../../api/client';
import { NovuApiError } from '../../api/client';
import type { IntegrationRecord } from '../../api/integrations';
import type { ResolvedConnectAuth } from '../../auth/resolve-connect-auth';
import type { AgentSummary, ConnectWebChatHandoff, ConnectCommandOptions } from '../../types';
import { logWebChatDashboardUrlHandoffEvent } from '../../ui/handoff-events';
import type { ConnectUI } from '../../ui/ui';

export async function connectWebChatForAgent(
  client: ConnectApiClient,
  agent: AgentSummary,
  ui: ConnectUI,
  options: ConnectCommandOptions,
  auth: ResolvedConnectAuth,
  track: (event: string, data?: Record<string, unknown>) => void
): Promise<{
  integration: IntegrationRecord;
  handoff: ConnectWebChatHandoff;
}> {
  ui.addingWebChatIntegration();

  let link;
  try {
    link = await addWebChatIntegration(client, agent.identifier);
  } catch (err) {
    throw normalizeWebChatProvisionError(err);
  }

  const integration: IntegrationRecord = {
    _id: link.integration._id,
    identifier: link.integration.identifier,
    name: link.integration.name,
    providerId: link.integration.providerId,
    channel: 'chat',
    active: link.integration.active !== false,
  };

  track(CONNECT_EVENTS.WEB_CHAT_LINKED, {
    agent: agent.identifier,
    alreadyLinked: Boolean(link.connectedAt),
  });

  const dashboardUrl = buildConnectWebChatDashboardUrl({
    connectDashboardUrl: options.connectDashboardUrl,
    environmentSlug: auth.environmentSlug ?? null,
    agentIdentifier: agent.identifier,
  });

  const handoff: ConnectWebChatHandoff = {
    dashboardUrl,
    embedPrompt: '',
  };

  await ui.awaitWebChatHandoff({
    dashboardUrl,
    embedPrompt: handoff.embedPrompt,
  });

  if (!ui.interactive) {
    logWebChatDashboardUrlHandoffEvent({ dashboardUrl });
  }

  return { integration, handoff };
}

function normalizeWebChatProvisionError(err: unknown): Error {
  if (err instanceof NovuApiError && err.status === 403) {
    return new Error(err.message);
  }

  return err instanceof Error ? err : new Error(String(err));
}
