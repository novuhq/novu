import open from 'open';
import { CONNECT_EVENTS } from '../../analytics/events';
import { addAgentEmailIntegration } from '../../api/agents';
import type { ConnectApiClient } from '../../api/client';
import type { IntegrationRecord } from '../../api/integrations';
import type { AgentSummary } from '../../types';
import type { ConnectUI } from '../../ui/ui';
import { pollForAgentLinkConnected } from '../integration-helpers';
import { CHANNEL_POLL_INTERVAL_MS, CHANNEL_POLL_TIMEOUT_MS } from '../poll-until';

export async function connectEmailForAgent(
  client: ConnectApiClient,
  agent: AgentSummary,
  ui: ConnectUI,
  track: (event: string, data?: Record<string, unknown>) => void,
  opts?: { sendFromEmail?: string; canGoBack?: boolean }
): Promise<{ connected: boolean; integration: IntegrationRecord }> {
  ui.addingEmailIntegration();

  const link = await addAgentEmailIntegration(client, agent.identifier);
  const inboundAddress = link.integration.sharedInboundAddress;
  if (!inboundAddress) {
    throw new Error(
      'The server did not return an inbound address for the email integration. ' +
        'Make sure NOVU_AGENT_SHARED_INBOUND_DOMAIN is configured on the API.'
    );
  }

  const integration: IntegrationRecord = {
    _id: link.integration._id,
    identifier: link.integration.identifier,
    name: link.integration.name,
    providerId: link.integration.providerId,
    channel: 'email',
    active: link.integration.active !== false,
  };

  if (link.connectedAt) {
    ui.emailConnected();
    track(CONNECT_EVENTS.EMAIL_CONNECTED, {
      agent: agent.identifier,
      alreadyConnected: true,
    });

    return { connected: true, integration };
  }

  const subject = `Hi ${agent.name}!`;
  const body = `Hey ${agent.name},\n\nThis is my first email — say hi back and tell me what you can do?\n\nThanks!`;
  const mailtoUrl = `mailto:${inboundAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  await ui.awaitEmailOpen({
    inboundAddress,
    mailtoUrl,
    sendFromEmail: opts?.sendFromEmail,
    canGoBack: opts?.canGoBack,
  });
  void open(mailtoUrl).catch(() => undefined);
  ui.showEmailWaiting({ inboundAddress, sendFromEmail: opts?.sendFromEmail });

  const connected = await pollForAgentLinkConnected(client, agent.identifier, integration.identifier, {
    intervalMs: CHANNEL_POLL_INTERVAL_MS,
    timeoutMs: CHANNEL_POLL_TIMEOUT_MS,
  });
  if (!connected) {
    throw new Error(
      `We didn't see your email at ${inboundAddress} within ${Math.round(CHANNEL_POLL_TIMEOUT_MS / 1000)}s. ` +
        'Re-run `npx novu connect` once you have sent the test message.'
    );
  }

  ui.emailConnected();
  track(CONNECT_EVENTS.EMAIL_CONNECTED, {
    agent: agent.identifier,
    alreadyConnected: false,
  });

  return { connected: true, integration };
}
