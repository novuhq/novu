import open from 'open';
import { CONNECT_EVENTS } from '../../analytics/events';
import type { ConnectApiClient } from '../../api/client';
import {
  createWhatsAppIntegration,
  createWhatsAppSignupLink,
  getWhatsAppEmbeddedSignupAvailability,
  getWhatsAppSignupLinkStatus,
  type IntegrationRecord,
  type WhatsAppEmbeddedSignupAvailabilityReason,
  type WhatsAppSignupLink,
} from '../../api/integrations';
import type { AgentSummary } from '../../types';
import { renderQR } from '../../ui/qr';
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

/**
 * `https://wa.me/<digits>?text=...` deep link from a display phone number like
 * "+1 555-123-4567", pre-filling the first message with a greeting to the agent.
 */
export function buildWaMeUrl(displayPhoneNumber: string, agentName: string): string | null {
  const digits = displayPhoneNumber.replace(/\D/g, '');
  if (!digits) return null;

  return `https://wa.me/${digits}?text=${encodeURIComponent(`Hi ${agentName}, how can you help?`)}`;
}

export type WhatsAppConnectResult =
  /** Embedded signup is unavailable (flag off, self-hosted without Meta credentials, or older API) — caller falls back to the account-based dashboard handoff. */
  | { kind: 'unavailable'; reason: WhatsAppEmbeddedSignupAvailabilityReason }
  | { kind: 'connected'; connected: boolean; integration: IntegrationRecord };

type WhatsAppSignupProgress = { credentialsSaved: boolean; displayPhoneNumber?: string };

/**
 * Poll-and-resume WhatsApp flow backed by the public tokenized Meta Embedded
 * Signup page: create + link the integration up front, mint an opaque signup
 * link (works for keyless and authenticated sessions alike), open the page,
 * poll the token until credentials land, then guide the user through an
 * inbound wa.me test message and poll for the first inbound connection.
 */
export async function connectWhatsAppForAgent(
  client: ConnectApiClient,
  agent: AgentSummary,
  ui: ConnectUI,
  environment: { environmentId: string },
  track: (event: string, data?: Record<string, unknown>) => void
): Promise<WhatsAppConnectResult> {
  const availability = await getWhatsAppEmbeddedSignupAvailability(client);
  // Explicit comparison: with strictNullChecks off, `!availability.available`
  // does not narrow the discriminated union.
  if (availability.available === false) {
    return { kind: 'unavailable', reason: availability.reason };
  }

  ui.addingWhatsAppIntegration();

  const integration = await resolveIntegrationForAgent(client, agent, environment.environmentId, {
    providerId: WHATSAPP_PROVIDER_ID,
    channel: WHATSAPP_CHANNEL,
    create: createWhatsAppIntegration,
  });

  await ensureAgentIntegrationLinked(client, agent.identifier, integration.identifier);

  const link = await createWhatsAppSignupLink(client, {
    agentIdentifier: agent.identifier,
    integrationIdentifier: integration.identifier,
  });

  // Re-runs resume where they left off: signup already done → skip straight
  // to the inbound test step.
  let status = await checkSignupProgress(client, link.token);

  if (status === 'expired' || !status.credentialsSaved) {
    status = await runSignupBrowserHandoff(client, agent, ui, link, track);
  }

  const waMeUrl = status.displayPhoneNumber ? buildWaMeUrl(status.displayPhoneNumber, agent.name) : null;
  const waMeQr = waMeUrl ? await renderQR(waMeUrl) : undefined;
  ui.showWhatsAppTest({
    waMeUrl: waMeUrl ?? undefined,
    waMeQr,
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

/** Reads the token status; an invalid or expired link reports `'expired'` (the link can no longer complete). */
async function checkSignupProgress(
  client: ConnectApiClient,
  token: string
): Promise<WhatsAppSignupProgress | 'expired'> {
  const status = await getWhatsAppSignupLinkStatus(client, token);

  if (!status.valid) {
    return 'expired';
  }

  return { credentialsSaved: status.credentialsSaved, displayPhoneNumber: status.displayPhoneNumber };
}

/** Stage 1: open the public tokenized signup page and poll until Meta Embedded Signup saves credentials. */
async function runSignupBrowserHandoff(
  client: ConnectApiClient,
  agent: AgentSummary,
  ui: ConnectUI,
  link: WhatsAppSignupLink,
  track: (event: string, data?: Record<string, unknown>) => void
): Promise<WhatsAppSignupProgress> {
  const signupUrl = link.url;

  await ui.awaitWhatsAppSignupOpen({ signupUrl });
  track(CONNECT_EVENTS.WHATSAPP_SIGNUP_OPENED, { agent: agent.identifier });

  void open(signupUrl).catch(() => undefined);
  ui.showWhatsAppSignupWaiting({ signupUrl });

  let latestStatus: WhatsAppSignupProgress = { credentialsSaved: false };
  let linkExpired = false;
  const saved = await pollUntil(
    async () => {
      const progress = await checkSignupProgress(client, link.token);

      // The link expiring mid-flow (30-minute TTL, longer than this poll
      // budget) means the signup can't complete on this run — bail out early.
      if (progress === 'expired') {
        linkExpired = true;

        return 'failed';
      }

      latestStatus = progress;

      return progress.credentialsSaved ? 'done' : 'pending';
    },
    { intervalMs: CHANNEL_POLL_INTERVAL_MS, timeoutMs: WHATSAPP_SIGNUP_POLL_TIMEOUT_MS }
  );

  if (!saved) {
    if (linkExpired) {
      track(CONNECT_EVENTS.WHATSAPP_SIGNUP_LINK_EXPIRED, { agent: agent.identifier });
      throw new Error(
        'Your WhatsApp signup link expired before the signup finished. Re-run `npx novu connect` to get a fresh link.'
      );
    }

    track(CONNECT_EVENTS.WHATSAPP_SIGNUP_TIMED_OUT, { agent: agent.identifier });
    throw new Error(
      `WhatsApp signup wasn't completed within ${Math.round(WHATSAPP_SIGNUP_POLL_TIMEOUT_MS / 60000)} minutes. ` +
        `Finish it here: ${signupUrl} — then re-run \`npx novu connect\` to resume.`
    );
  }

  track(CONNECT_EVENTS.WHATSAPP_SIGNUP_COMPLETED, { agent: agent.identifier });

  return latestStatus;
}
