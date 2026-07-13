import open from 'open';
import { CONNECT_EVENTS } from '../../analytics/events';
import { listAgentIntegrations } from '../../api/agents';
import type { ConnectApiClient } from '../../api/client';
import { createSendblueIntegration, type IntegrationRecord, type SendblueCredentials } from '../../api/integrations';
import { configureSendblueWebhook, removeSendblueWebhooks, sendSendblueTestMessage } from '../../api/sendblue';
import { getSubscriberPhone, upsertSubscriber } from '../../api/subscribers';
import type { AgentSummary, ConnectCommandOptions } from '../../types';
import type { ConnectUI } from '../../ui/ui';
import { ensureAgentIntegrationLinked, pollForAgentLinkConnected } from '../integration-helpers';
import { CHANNEL_POLL_INTERVAL_MS, CHANNEL_POLL_TIMEOUT_MS } from '../poll-until';

const SENDBLUE_PROVIDER_ID = 'sendblue';
const SENDBLUE_DASHBOARD_URL = 'https://dashboard.sendblue.com/settings/api';
const SENDBLUE_PHONE_NUMBER_URL = 'https://dashboard.sendblue.com/settings/phone-line-management';
/** E.164: leading `+`, first digit 1-9, 7-15 digits total. */
const E164_PATTERN = /^\+[1-9]\d{6,14}$/;
const MAX_TEST_PHONE_ATTEMPTS = 5;

/** Mirrors the dashboard's `buildImessageFallbackHref`: opens Messages pre-addressed to the agent number. */
function buildImessageHref(fromNumber: string, agentName: string): string {
  const body = `Hi ${agentName}, how can you help?`;

  return `sms:${encodeURIComponent(fromNumber)}?body=${encodeURIComponent(body)}`;
}

export async function connectSendblueForAgent(
  client: ConnectApiClient,
  agent: AgentSummary,
  ui: ConnectUI,
  options: ConnectCommandOptions,
  environmentId: string,
  subscriberId: string,
  track: (event: string, data?: Record<string, unknown>) => void
): Promise<{ connected: boolean; integration: IntegrationRecord }> {
  ui.addingSendblueIntegration();

  const alreadyConnected = await findConnectedSendblueLink(client, agent.identifier);
  if (alreadyConnected) {
    ui.sendblueConnected();
    track(CONNECT_EVENTS.SENDBLUE_CONNECTED, { agent: agent.identifier, alreadyConnected: true });

    return { connected: true, integration: alreadyConnected };
  }

  const credentials = await collectSendblueCredentials(ui, options);

  const integration = await createSendblueIntegration(client, {
    name: agent.name,
    environmentId,
    credentials,
  });
  await ensureAgentIntegrationLinked(client, agent.identifier, integration.identifier);

  await configureWebhook(client, agent, integration, ui);

  const imessageUrl = buildImessageHref(credentials.from, agent.name);
  const testPhone = await promptAndSendTestMessage(client, agent, integration, ui, options, subscriberId, {
    fromNumber: credentials.from,
    imessageUrl,
  });

  ui.showSendblueTestWaiting({ phone: testPhone, fromNumber: credentials.from, imessageUrl });
  void open(imessageUrl).catch(() => undefined);

  const connected = await pollForAgentLinkConnected(client, agent.identifier, integration.identifier, {
    intervalMs: CHANNEL_POLL_INTERVAL_MS,
    timeoutMs: CHANNEL_POLL_TIMEOUT_MS,
  });
  if (!connected) {
    throw new Error(
      `We didn't see an inbound iMessage on ${credentials.from} within ${Math.round(CHANNEL_POLL_TIMEOUT_MS / 1000)}s. ` +
        'Text the number from your phone, then re-run `npx novu connect`.'
    );
  }

  ui.sendblueConnected();
  track(CONNECT_EVENTS.SENDBLUE_CONNECTED, { agent: agent.identifier, alreadyConnected: false });

  return { connected: true, integration };
}

async function findConnectedSendblueLink(
  client: ConnectApiClient,
  agentIdentifier: string
): Promise<IntegrationRecord | undefined> {
  const links = await listAgentIntegrations(client, agentIdentifier);
  const connected = links.find((l) => l.integration.providerId === SENDBLUE_PROVIDER_ID && l.connectedAt);
  if (!connected) return undefined;

  return {
    _id: connected.integration._id,
    identifier: connected.integration.identifier,
    name: connected.integration.name,
    providerId: connected.integration.providerId,
    channel: connected.integration.channel,
    active: connected.integration.active !== false,
  };
}

async function collectSendblueCredentials(ui: ConnectUI, options: ConnectCommandOptions): Promise<SendblueCredentials> {
  const flagApiKey = options.sendblueApiKey?.trim();
  const flagSecretKey = options.sendblueSecretKey?.trim();
  const flagFrom = options.sendblueFrom?.trim();

  if (flagApiKey && flagSecretKey && flagFrom) {
    return { apiKey: flagApiKey, secretKey: flagSecretKey, from: flagFrom };
  }

  if (!ui.interactive) {
    throw new Error(
      'Non-interactive mode: pass --sendblue-api-key, --sendblue-secret-key and --sendblue-from to connect iMessage (Sendblue).'
    );
  }

  await ui.showSendblueIntro({ dashboardUrl: SENDBLUE_DASHBOARD_URL });

  const apiKey =
    flagApiKey ??
    (
      await ui.promptForSendblueCredential({
        field: 'apiKey',
        step: 1,
        total: 3,
        title: 'Sendblue API Key',
        hint: 'Copy the API Key from your Sendblue API settings.',
        placeholder: 'Paste your Sendblue API Key',
        dashboardUrl: SENDBLUE_DASHBOARD_URL,
        secret: true,
      })
    ).trim();

  const secretKey =
    flagSecretKey ??
    (
      await ui.promptForSendblueCredential({
        field: 'secretKey',
        step: 2,
        total: 3,
        title: 'Sendblue Secret Key',
        hint: 'Copy the Secret Key from the same Sendblue API settings page.',
        placeholder: 'Paste your Sendblue Secret Key',
        dashboardUrl: SENDBLUE_DASHBOARD_URL,
        secret: true,
      })
    ).trim();

  const from = flagFrom ?? (await promptForFromNumber(ui));

  return { apiKey, secretKey, from };
}

async function promptForFromNumber(ui: ConnectUI): Promise<string> {
  let verificationError: string | undefined;

  for (let attempt = 1; attempt <= MAX_TEST_PHONE_ATTEMPTS; attempt++) {
    const value = (
      await ui.promptForSendblueCredential({
        field: 'from',
        step: 3,
        total: 3,
        title: 'Sendblue phone number',
        hint: 'The number Sendblue assigned you, in E.164 format (e.g. +14155551234).',
        placeholder: '+14155551234',
        dashboardUrl: SENDBLUE_PHONE_NUMBER_URL,
        verificationError,
      })
    ).trim();

    if (E164_PATTERN.test(value)) {
      return value;
    }

    verificationError = 'Enter the number in E.164 format, e.g. +14155551234.';
  }

  throw new Error('A valid Sendblue phone number (E.164) is required to continue.');
}

async function configureWebhook(
  client: ConnectApiClient,
  agent: AgentSummary,
  integration: IntegrationRecord,
  ui: ConnectUI
): Promise<void> {
  ui.configuringSendblueWebhook();

  const result = await configureSendblueWebhook(client, agent.identifier, integration.identifier);

  // Sendblue webhooks are account-level, so a shared line may carry stale Novu
  // registrations from other agents/environments — remove them so only this
  // agent's webhook fires.
  if (result.existingNovuWebhookUrls && result.existingNovuWebhookUrls.length > 0) {
    try {
      await removeSendblueWebhooks(client, agent.identifier, integration.identifier, result.existingNovuWebhookUrls);
    } catch {
      // Best-effort cleanup — a failure here doesn't block the new registration.
    }
  }

  if (result.fallbackToManual || !result.success) {
    await ui.showSendblueWebhookManualFallback({
      callbackUrl: result.callbackUrl,
      webhookSecret: result.webhookSecret,
    });
  }
}

async function promptAndSendTestMessage(
  client: ConnectApiClient,
  agent: AgentSummary,
  integration: IntegrationRecord,
  ui: ConnectUI,
  options: ConnectCommandOptions,
  subscriberId: string,
  ctx: { fromNumber: string; imessageUrl: string }
): Promise<string> {
  const flagPhone = options.sendblueTestPhone?.trim();

  if (!ui.interactive) {
    if (!flagPhone) {
      throw new Error('Non-interactive mode: pass --sendblue-test-phone <+E.164> for the Sendblue test message.');
    }
    if (!E164_PATTERN.test(flagPhone)) {
      throw new Error(`Invalid --sendblue-test-phone "${flagPhone}". Expected E.164 format, e.g. +14155551234.`);
    }

    await persistPhoneAndSend(client, agent, integration, ui, subscriberId, flagPhone);

    return flagPhone;
  }

  let defaultPhone = flagPhone ?? (await getSubscriberPhone(client, subscriberId));
  let verificationError: string | undefined;

  for (let attempt = 1; attempt <= MAX_TEST_PHONE_ATTEMPTS; attempt++) {
    const phone = (
      await ui.promptForSendblueTestPhone({
        defaultPhone,
        fromNumber: ctx.fromNumber,
        imessageUrl: ctx.imessageUrl,
        verificationError,
      })
    ).trim();

    if (!E164_PATTERN.test(phone)) {
      verificationError = 'Enter the number in E.164 format, e.g. +14155551234.';
      defaultPhone = phone;
      continue;
    }

    const outcome = await persistPhoneAndSend(client, agent, integration, ui, subscriberId, phone);
    if (outcome.retryable) {
      verificationError = outcome.message;
      defaultPhone = phone;
      continue;
    }

    return phone;
  }

  throw new Error('Could not send a Sendblue test message after several attempts. Re-run `npx novu connect`.');
}

/**
 * Persists the recipient phone onto the subscriber (the test-message endpoint
 * reads `subscriber.phone`) and sends the test message. Returns whether the
 * caller should re-prompt for a different number.
 *
 * `recipient_not_verified` is expected on Sendblue's shared lines — the user
 * simply needs to text the number first — so it is NOT treated as retryable:
 * the flow proceeds to the "message the bot" link + inbound polling.
 */
async function persistPhoneAndSend(
  client: ConnectApiClient,
  agent: AgentSummary,
  integration: IntegrationRecord,
  ui: ConnectUI,
  subscriberId: string,
  phone: string
): Promise<{ retryable: boolean; message?: string }> {
  await upsertSubscriber(client, { subscriberId, phone });

  ui.sendingSendblueTestMessage();
  const result = await sendSendblueTestMessage(client, agent.identifier, integration.identifier, subscriberId);

  if (result.success || result.error?.code === 'recipient_not_verified') {
    return { retryable: false };
  }

  if (result.error?.code === 'invalid_recipient') {
    return { retryable: true, message: result.error.message || 'Sendblue rejected that recipient number.' };
  }

  throw new Error(result.error?.message ?? 'Sendblue rejected the test message.');
}
