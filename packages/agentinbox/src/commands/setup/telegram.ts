import pc from 'picocolors';
import type { ApiClient } from '../../api/client';
import {
  consumeTelegramMobileLink,
  createTelegramIntegration,
  hasChannelEndpoint,
  issueTelegramMobileLink,
  issueTelegramSubscriberLink,
} from '../../api/setup';
import { info } from '../../cli-io';
import { renderQR } from '../../qr';
import {
  buildSetupPageUrl,
  CREDENTIAL_PROPAGATION_TIMEOUT_MS,
  isMissingBotTokenError,
  issueTelegramSubscriberLinkWithRetry,
  waitForEndpoint,
  waitForTelegramSetupPage,
} from '../link-channel';
import type { SetupOptions } from './operator';
import {
  defaultSetupIo,
  handOffToSetupPage,
  resolveCredentialEntry,
  resolveLinkedIntegration,
  type SetupIo,
} from './prompts';

const BOTFATHER_URL = 'https://t.me/botfather';

/**
 * Links Telegram for the person, resuming at whatever step is still missing:
 *
 *   1. channel endpoint exists         → already connected
 *   2. bot token saved, no `/start` yet → show the deep link, wait
 *   3. no bot token                     → on a TTY, ask whether to paste the
 *      token here or use the landing page; without a TTY, use the page. Then 2.
 *
 * `--telegram-bot-token` skips that choice and saves the token directly.
 */
export async function connectTelegram(
  client: ApiClient,
  agentIdentifier: string,
  agentName: string,
  subscriberId: string,
  options: Pick<SetupOptions, 'telegramBotToken'>,
  io: SetupIo = defaultSetupIo
): Promise<string> {
  const integrationIdentifier = await resolveLinkedIntegration(client, agentIdentifier, 'telegram', () =>
    createTelegramIntegration(client, agentName)
  );

  if (await hasChannelEndpoint(client, integrationIdentifier, subscriberId)) {
    info('Telegram already connected.');

    return integrationIdentifier;
  }

  const subscriberLink = await resolveTelegramSubscriberLink(client, integrationIdentifier, subscriberId, options, io);

  io.write(
    `\nOpen @${pc.bold(subscriberLink.botUsername)} in Telegram and tap ${pc.bold('Start')}` +
      (io.isTTY ? ` (scan the QR or use the link):\n\n${renderQR(subscriberLink.deepLinkUrl)}\n\n` : ':\n\n') +
      `  ${pc.underline(subscriberLink.deepLinkUrl)}\n\n`
  );

  await waitForEndpoint(client, integrationIdentifier, subscriberId, `your /start on @${subscriberLink.botUsername}`);
  info('Telegram connected.');

  return integrationIdentifier;
}

/**
 * Produces the `/start` deep link, first making sure the integration has a bot
 * token: from `--telegram-bot-token`, pasted at the prompt, or collected on
 * the landing page. Minting the deep link doubles as the credentials probe — it
 * only fails with "bot token is missing" when that step is still outstanding.
 * Right after a save, credentials can take a moment to become readable, so
 * those paths use the retrying variant instead of bouncing back to the page.
 */
async function resolveTelegramSubscriberLink(
  client: ApiClient,
  integrationIdentifier: string,
  subscriberId: string,
  options: Pick<SetupOptions, 'telegramBotToken'>,
  io: SetupIo
): Promise<{ deepLinkUrl: string; botUsername: string }> {
  const botToken = options.telegramBotToken?.trim();
  if (botToken) {
    return saveTelegramBotToken(client, integrationIdentifier, subscriberId, botToken);
  }

  try {
    return await issueTelegramSubscriberLink(client, integrationIdentifier, subscriberId);
  } catch (err) {
    if (!isMissingBotTokenError(err)) throw err;
  }

  const entry = await resolveCredentialEntry(io, {
    heading: 'How do you want to connect the Telegram bot?',
    pasteLabel: 'Paste the bot token here',
  });

  switch (entry) {
    case 'cli': {
      const pasted = await promptForBotToken(io);

      return saveTelegramBotToken(client, integrationIdentifier, subscriberId, pasted);
    }
    case 'page':
      await handOffToTelegramSetupPage(client, integrationIdentifier, subscriberId, io);

      return issueTelegramSubscriberLinkWithRetry(client, integrationIdentifier, subscriberId);
    default: {
      const exhaustive: never = entry;

      return exhaustive;
    }
  }
}

async function saveTelegramBotToken(
  client: ApiClient,
  integrationIdentifier: string,
  subscriberId: string,
  botToken: string
): Promise<{ deepLinkUrl: string; botUsername: string }> {
  const mobileLink = await issueTelegramMobileLink(client, integrationIdentifier, subscriberId);
  await consumeTelegramMobileLink(client, { token: mobileLink.token, botToken });

  return issueTelegramSubscriberLinkWithRetry(client, integrationIdentifier, subscriberId);
}

async function promptForBotToken(io: SetupIo): Promise<string> {
  io.write(
    `\nCreate a Telegram bot (this is your private line to your agents):\n` +
      `  1. Open ${pc.underline(BOTFATHER_URL)}\n` +
      `  2. Send ${pc.bold('/newbot')} and follow the prompts\n` +
      `  3. Paste the token BotFather gives you below\n\n`
  );

  for (let attempt = 0; attempt < 5; attempt++) {
    const token = (await io.promptSecret('Telegram bot token: ')).trim();
    if (/^\d+:[\w-]+$/.test(token)) {
      return token;
    }

    io.write(`${pc.yellow('That does not look like a bot token (expected 123456:ABC-...).')}\n`);
  }

  throw new Error(
    'No valid bot token provided. Re-run `npx @agentinbox/cli setup telegram` or pass --telegram-bot-token.'
  );
}

async function handOffToTelegramSetupPage(
  client: ApiClient,
  integrationIdentifier: string,
  subscriberId: string,
  io: SetupIo
): Promise<void> {
  const mobileLink = await issueTelegramMobileLink(client, integrationIdentifier, subscriberId);
  const setupUrl = buildSetupPageUrl(client.apiUrl, 'telegram', mobileLink.token, mobileLink.url);

  await handOffToSetupPage({
    channelLabel: 'Telegram',
    rerunCommand: 'npx @agentinbox/cli setup telegram',
    intro: 'Telegram needs a private bot that only you control.',
    waiting: 'Waiting for you to connect the bot… the link stays open while the page is open.',
    savedMessage: 'Bot token saved.',
    pageUrl: setupUrl,
    poll: () => waitForTelegramSetupPage(client, mobileLink.token),
    io,
  });
}
