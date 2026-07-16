import open from 'open';
import { CONNECT_EVENTS } from '../../analytics/events';
import type { ConnectApiClient } from '../../api/client';
import {
  createWhatsAppIntegration,
  getWhatsAppEmbeddedSignupAvailability,
  getWhatsAppSignupStatus,
  type IntegrationRecord,
} from '../../api/integrations';
import { buildWaMeUrl, buildWhatsAppSignupUrl } from '../../dashboard-urls';
import type { AgentSummary, ConnectCommandOptions } from '../../types';
import type { ConnectUI } from '../../ui/ui';
import {
  ensureAgentIntegrationLinked,
  pollForAgentLinkConnected,
  resolveIntegrationForAgent,
} from '../integration-helpers';
import {
  CHANNEL_POLL_INTERVAL_MS,
  CHANNEL_POLL_TIMEOUT_MS,
  pollUntil,
  WHATSAPP_SIGNUP_POLL_TIMEOUT_MS,
} from '../poll-until';

const WHATSAPP_PROVIDER_ID = 'whatsapp-business';
const WHATSAPP_CHANNEL = 'chat';

export type WhatsAppConnectResult =
  /** Embedded signup is unavailable (flag off, self-hosted without Meta credentials, older API, or no environment slug) — caller falls back to the classic dashboard handoff. */
  { kind: 'unavailable'; reason: string } | { kind: 'connected'; connected: boolean; integration: IntegrationRecord };

/**
 * Poll-and-resume WhatsApp flow backed by the dashboard's Meta Embedded
 * Signup page: create + link the integration up front, open the minimal
 * signup page, poll until credentials land, then guide the user through an
 * inbound wa.me test message and poll for the first inbound connection.
 */
export async function connectWhatsAppForAgent(
  client: ConnectApiClient,
  agent: AgentSummary,
  ui: ConnectUI,
  options: ConnectCommandOptions,
  environment: { environmentId: string; environmentSlug: string | null },
  track: (event: string, data?: Record<string, unknown>) => void
): Promise<WhatsAppConnectResult> {
  const availability = await getWhatsAppEmbeddedSignupAvailability(client);
  if (!availability.available) {
    return { kind: 'unavailable', reason: availability.reason ?? 'unavailable' };
  }

  // The signup page route needs an environment slug; sessions without one
  // (should not happen post keyless-upgrade) keep the old handoff.
  if (!environment.environmentSlug) {
    return { kind: 'unavailable', reason: 'missing_environment_slug' };
  }

  ui.addingWhatsAppIntegration();

  const integration = await resolveIntegrationForAgent(client, agent, environment.environmentId, {
    providerId: WHATSAPP_PROVIDER_ID,
    channel: WHATSAPP_CHANNEL,
    create: createWhatsAppIntegration,
  });

  await ensureAgentIntegrationLinked(client, agent.identifier, integration.identifier);

  const signupUrl = buildWhatsAppSignupUrl({
    connectDashboardUrl: options.connectDashboardUrl,
    environmentSlug: environment.environmentSlug,
    agentIdentifier: agent.identifier,
    integrationIdentifier: integration.identifier,
  });

  // Re-runs resume where they left off: signup already done → skip straight
  // to the inbound test step.
  let status = await getWhatsAppSignupStatus(client, integration.identifier);

  if (!status.credentialsSaved) {
    status = await runSignupBrowserHandoff(client, agent, ui, integration, signupUrl, track);
  }

  const waMeUrl = status.displayPhoneNumber ? buildWaMeUrl(status.displayPhoneNumber) : null;
  ui.showWhatsAppTest({
    waMeUrl: waMeUrl ?? undefined,
    displayPhoneNumber: status.displayPhoneNumber,
  });

  const connected = await pollForAgentLinkConnected(client, agent.identifier, integration.identifier, {
    intervalMs: CHANNEL_POLL_INTERVAL_MS,
    timeoutMs: CHANNEL_POLL_TIMEOUT_MS,
  });
  if (!connected) {
    const target = status.displayPhoneNumber ?? 'your WhatsApp business number';
    throw new Error(
      `We didn't see a WhatsApp message to ${target} within ` +
        `${Math.round(CHANNEL_POLL_TIMEOUT_MS / 1000)} seconds. Send any message from your phone and ` +
        're-run `npx novu connect` to resume.'
    );
  }

  ui.whatsappConnected();
  track(CONNECT_EVENTS.WHATSAPP_CONNECTED, { agent: agent.identifier });

  return { kind: 'connected', connected: true, integration };
}

/** Stage 1: open the dashboard signup page and poll until Meta Embedded Signup saves credentials. */
async function runSignupBrowserHandoff(
  client: ConnectApiClient,
  agent: AgentSummary,
  ui: ConnectUI,
  integration: IntegrationRecord,
  signupUrl: string,
  track: (event: string, data?: Record<string, unknown>) => void
): Promise<{ credentialsSaved: boolean; displayPhoneNumber?: string }> {
  await ui.awaitWhatsAppSignupOpen({ signupUrl });
  track(CONNECT_EVENTS.WHATSAPP_SIGNUP_OPENED, { agent: agent.identifier });

  void open(signupUrl).catch(() => undefined);
  ui.showWhatsAppSignupWaiting({ signupUrl });

  let latestStatus: { credentialsSaved: boolean; displayPhoneNumber?: string } = { credentialsSaved: false };
  const saved = await pollUntil(
    async () => {
      latestStatus = await getWhatsAppSignupStatus(client, integration.identifier);

      return latestStatus.credentialsSaved ? 'done' : 'pending';
    },
    { intervalMs: CHANNEL_POLL_INTERVAL_MS, timeoutMs: WHATSAPP_SIGNUP_POLL_TIMEOUT_MS }
  );

  if (!saved) {
    track(CONNECT_EVENTS.WHATSAPP_SIGNUP_TIMED_OUT, { agent: agent.identifier });
    throw new Error(
      `WhatsApp signup wasn't completed within ${Math.round(WHATSAPP_SIGNUP_POLL_TIMEOUT_MS / 60000)} minutes. ` +
        `Finish it here: ${signupUrl} — then re-run \`npx novu connect\` to resume.`
    );
  }

  track(CONNECT_EVENTS.WHATSAPP_SIGNUP_COMPLETED, { agent: agent.identifier });

  return latestStatus;
}
