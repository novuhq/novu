import { CONNECT_EVENTS } from '../../analytics/events';
import {
  consumeTelegramMobileLink,
  getTelegramMobileLinkStatus,
  issueTelegramMobileLink,
  issueTelegramSubscriberLink,
  type TelegramSubscriberLinkResult,
} from '../../api/agents';
import type { ConnectApiClient } from '../../api/client';
import { createTelegramIntegration, type IntegrationRecord } from '../../api/integrations';
import type { AgentSummary, ConnectCommandOptions } from '../../types';
import { renderQR } from '../../ui/qr';
import type { ConnectUI } from '../../ui/ui';
import {
  ensureAgentIntegrationLinked,
  pollForAgentLinkConnected,
  resolveIntegrationForAgent,
} from '../integration-helpers';
import { CHANNEL_POLL_INTERVAL_MS, CHANNEL_POLL_TIMEOUT_MS, pollUntil } from '../poll-until';

const TELEGRAM_PROVIDER_ID = 'telegram';
const TELEGRAM_CHANNEL = 'chat';
const BOTFATHER_URL = 'https://t.me/botfather';

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

  const existingLink = await ensureAgentIntegrationLinked(client, agent.identifier, integration.identifier);
  if (existingLink?.connectedAt) {
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
    // The user already created the bot and pasted its token (e.g. collected
    // by an AI agent in chat). Save it directly — keyless users cannot open
    // the dashboard mobile-link page.
    ui.savingTelegramBotToken();
    const mobileLink = await issueTelegramMobileLink(client, agent.identifier, integration._id, subscriberId);
    try {
      const consumeResult = await consumeTelegramMobileLink(client, { token: mobileLink.token, botToken });

      if (consumeResult.deepLinkUrl) {
        prefetchedSubscriberLink = {
          deepLinkUrl: consumeResult.deepLinkUrl,
          botUsername: consumeResult.botUsername,
          expiresAt: mobileLink.expiresAt,
        };
      }
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

    const mobileLink = await issueTelegramMobileLink(client, agent.identifier, integration._id, subscriberId);
    const mobileQr = await renderQR(mobileLink.url);
    ui.showTelegramLinkToken({ mobileQr, mobileUrl: mobileLink.url });

    const tokenSaved = await pollUntil(
      async () => {
        const status = await getTelegramMobileLinkStatus(client, mobileLink.token);
        if (!status.valid && status.reason === 'used') return 'done';
        if (!status.valid) return 'failed';

        return 'pending';
      },
      { intervalMs: CHANNEL_POLL_INTERVAL_MS, timeoutMs: CHANNEL_POLL_TIMEOUT_MS }
    );
    if (!tokenSaved) {
      throw new Error(
        `The bot token wasn't saved within ${Math.round(CHANNEL_POLL_TIMEOUT_MS / 1000)} seconds. ` +
          'Re-run `npx novu connect` to get a fresh setup link.'
      );
    }
  }

  const subscriberLink =
    prefetchedSubscriberLink ??
    (await issueTelegramSubscriberLink(client, agent.identifier, integration._id, subscriberId));
  const deepLinkQr = await renderQR(subscriberLink.deepLinkUrl);
  ui.showTelegramTest({
    deepLinkQr,
    deepLinkUrl: subscriberLink.deepLinkUrl,
    botUsername: subscriberLink.botUsername,
  });

  const connected = await pollForAgentLinkConnected(client, agent.identifier, integration.identifier, {
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
