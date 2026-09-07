import { CONNECT_EVENTS } from '../../analytics/events';
import {
  consumeTelegramMobileLink,
  getTelegramMobileLinkStatus,
  issueTelegramMobileLink,
  issueTelegramSubscriberLink,
  type TelegramSubscriberLinkResult,
} from '../../api/agents';
import { isTelegramSubscriberConnected, pollForTelegramChannelEndpoint } from '../../api/channel-endpoints';
import { type ConnectApiClient, NovuApiError } from '../../api/client';
import { createTelegramIntegration, type IntegrationRecord } from '../../api/integrations';
import type { AgentSummary, ConnectCommandOptions } from '../../types';
import { renderQR } from '../../ui/qr';
import type { ConnectUI } from '../../ui/ui';
import { ensureAgentIntegrationLinked, resolveIntegrationForAgent } from '../integration-helpers';
import { CHANNEL_POLL_INTERVAL_MS, CHANNEL_POLL_TIMEOUT_MS, pollUntil, sleep } from '../poll-until';

const TELEGRAM_PROVIDER_ID = 'telegram';
const TELEGRAM_CHANNEL = 'chat';
const BOTFATHER_URL = 'https://t.me/botfather';
const MAX_TELEGRAM_TOKEN_ATTEMPTS = 5;

/**
 * After the secure setup page saves the BotFather token, the credentials can
 * take a moment to become readable. The subscriber-link build is retried over
 * this window so a transient "bot token missing" right after save doesn't abort
 * the whole run when the user just needs the token to propagate.
 */
const TELEGRAM_CREDENTIAL_PROPAGATION_TIMEOUT_MS = 30_000;
const TELEGRAM_CREDENTIAL_PROPAGATION_INTERVAL_MS = 2_000;

export async function connectTelegramForAgent(
  client: ConnectApiClient,
  agent: AgentSummary,
  ui: ConnectUI,
  options: ConnectCommandOptions,
  environmentId: string,
  subscriberId: string,
  track: (event: string, data?: Record<string, unknown>) => void
): Promise<{ connected: boolean; integration: IntegrationRecord }> {
  ui.addingTelegramIntegration();

  const integration = await resolveIntegrationForAgent(client, agent, environmentId, {
    providerId: TELEGRAM_PROVIDER_ID,
    channel: TELEGRAM_CHANNEL,
    create: createTelegramIntegration,
  });

  await ensureAgentIntegrationLinked(client, agent.identifier, integration.identifier);

  if (await isTelegramSubscriberConnected(client, integration.identifier, subscriberId)) {
    ui.telegramConnected();
    track(CONNECT_EVENTS.TELEGRAM_CONNECTED, {
      agent: agent.identifier,
      alreadyConnected: true,
    });

    return { connected: true, integration };
  }

  const botToken = options.telegramBotToken?.trim();
  let prefetchedSubscriberLink: TelegramSubscriberLinkResult | undefined;

  if (botToken) {
    ui.savingTelegramBotToken();
    try {
      prefetchedSubscriberLink = await saveTelegramBotTokenViaMobileLink(client, integration, subscriberId, botToken);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Telegram didn't accept the bot token: ${message}. ` +
          'Double-check the token from @BotFather and re-run with --telegram-bot-token.'
      );
    }
  } else {
    const botfatherQr = await renderQR(BOTFATHER_URL);
    await ui.showTelegramIntro({ botfatherQr, botfatherUrl: BOTFATHER_URL });

    if (ui.interactive && (await ui.pickTelegramTokenDelivery()) === 'terminal') {
      prefetchedSubscriberLink = await promptAndSaveTelegramBotToken(client, integration, subscriberId, ui);
    } else {
      await waitForTelegramSetupPageToken(client, integration, subscriberId, ui);
    }
  }

  const subscriberLink =
    prefetchedSubscriberLink ??
    (await issueSubscriberLinkWithCredentialRetry(client, integration.identifier, subscriberId));
  const deepLinkQr = await renderQR(subscriberLink.deepLinkUrl);
  ui.showTelegramTest({
    deepLinkQr,
    deepLinkUrl: subscriberLink.deepLinkUrl,
    botUsername: subscriberLink.botUsername,
  });

  const connected = await pollForTelegramChannelEndpoint(client, integration.identifier, subscriberId, {
    intervalMs: CHANNEL_POLL_INTERVAL_MS,
    timeoutMs: CHANNEL_POLL_TIMEOUT_MS,
  });
  if (!connected) {
    throw new Error(
      `We didn't see a /start message on @${subscriberLink.botUsername} within ` +
        `${Math.round(CHANNEL_POLL_TIMEOUT_MS / 1000)} seconds. Re-run \`npx novu connect\` once you've ` +
        'opened the bot in Telegram and tapped Start.'
    );
  }

  ui.telegramConnected();
  track(CONNECT_EVENTS.TELEGRAM_CONNECTED, {
    agent: agent.identifier,
    alreadyConnected: false,
  });

  return { connected: true, integration };
}

async function issueSubscriberLinkWithCredentialRetry(
  client: ConnectApiClient,
  integrationIdentifier: string,
  subscriberId: string
): Promise<TelegramSubscriberLinkResult> {
  const deadline = Date.now() + TELEGRAM_CREDENTIAL_PROPAGATION_TIMEOUT_MS;

  while (true) {
    try {
      return await issueTelegramSubscriberLink(client, integrationIdentifier, subscriberId);
    } catch (err) {
      if (!isMissingBotTokenError(err) || Date.now() >= deadline) {
        throw err;
      }

      await sleep(TELEGRAM_CREDENTIAL_PROPAGATION_INTERVAL_MS);
    }
  }
}

function isMissingBotTokenError(err: unknown): boolean {
  if (!(err instanceof NovuApiError)) return false;
  if (err.status !== 422) return false;

  return /bot token is missing/i.test(err.message);
}

async function saveTelegramBotTokenViaMobileLink(
  client: ConnectApiClient,
  integration: IntegrationRecord,
  subscriberId: string,
  botToken: string
): Promise<TelegramSubscriberLinkResult | undefined> {
  const mobileLink = await issueTelegramMobileLink(client, integration.identifier, subscriberId);
  const consumeResult = await consumeTelegramMobileLink(client, { token: mobileLink.token, botToken });

  if (consumeResult.deepLinkUrl) {
    return {
      deepLinkUrl: consumeResult.deepLinkUrl,
      botUsername: consumeResult.botUsername,
      expiresAt: mobileLink.expiresAt,
    };
  }

  return undefined;
}

async function promptAndSaveTelegramBotToken(
  client: ConnectApiClient,
  integration: IntegrationRecord,
  subscriberId: string,
  ui: ConnectUI
): Promise<TelegramSubscriberLinkResult | undefined> {
  let verificationError: string | undefined;

  for (let attempt = 1; attempt <= MAX_TELEGRAM_TOKEN_ATTEMPTS; attempt++) {
    const token = await ui.promptForSecretInput({
      title: 'Telegram bot token',
      placeholder: '123456:ABC-…',
      hint: 'Paste the token @BotFather sent you.',
      verificationError,
    });

    try {
      return await saveTelegramBotTokenViaMobileLink(client, integration, subscriberId, token.trim());
    } catch (err) {
      if (!isRepromptableTelegramTokenError(err)) {
        throw err;
      }

      verificationError = err instanceof Error ? err.message : String(err);
    }
  }

  throw new Error(
    `Telegram didn't accept the bot token after ${MAX_TELEGRAM_TOKEN_ATTEMPTS} attempts. ` +
      'Double-check the token from @BotFather and re-run `npx novu connect`.'
  );
}

function isRepromptableTelegramTokenError(err: unknown): boolean {
  if (!(err instanceof NovuApiError)) return false;
  if (err.status === 0) return false;

  return err.status >= 400 && err.status < 500;
}

async function waitForTelegramSetupPageToken(
  client: ConnectApiClient,
  integration: IntegrationRecord,
  subscriberId: string,
  ui: ConnectUI
): Promise<void> {
  const mobileLink = await issueTelegramMobileLink(client, integration.identifier, subscriberId);
  const mobileQr = await renderQR(mobileLink.url);
  ui.showTelegramLinkToken({ mobileQr, mobileUrl: mobileLink.url });

  let setupLinkFailure: 'expired' | 'invalid' | undefined;

  const tokenSaved = await pollUntil(
    async () => {
      const status = await getTelegramMobileLinkStatus(client, mobileLink.token);
      if (!status.valid && status.reason === 'used') return 'done';
      if (!status.valid && status.reason === 'expired') {
        setupLinkFailure = 'expired';

        return 'failed';
      }
      if (!status.valid) {
        setupLinkFailure = 'invalid';

        return 'failed';
      }

      return 'pending';
    },
    { intervalMs: CHANNEL_POLL_INTERVAL_MS, timeoutMs: CHANNEL_POLL_TIMEOUT_MS }
  );
  if (!tokenSaved) {
    if (setupLinkFailure === 'expired') {
      throw new Error(
        'The Telegram setup link expired before you could paste your bot token. Re-run `npx novu connect` to get a fresh link.'
      );
    }
    if (setupLinkFailure === 'invalid') {
      throw new Error('The Telegram setup link is no longer valid. Re-run `npx novu connect` to get a fresh link.');
    }

    throw new Error(
      `The bot token wasn't saved within ${Math.round(CHANNEL_POLL_TIMEOUT_MS / 1000)} seconds. ` +
        'Re-run `npx novu connect` to get a fresh setup link.'
    );
  }
}
