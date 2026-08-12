import { randomBytes } from 'node:crypto';
import readline from 'node:readline';
import pc from 'picocolors';
import { createHumanApiClient, HumanApiError, type HumanApiClient } from '../api/client';
import { createInteraction, setupHumanRelay } from '../api/human';
import {
  bootstrapKeylessSession,
  consumeTelegramMobileLink,
  createTelegramIntegration,
  hasChannelEndpoint,
  issueTelegramMobileLink,
  issueTelegramSubscriberLink,
  linkAgentIntegration,
  listAgentIntegrations,
  listIntegrations,
} from '../api/setup';
import {
  DEFAULT_API_URL,
  DEFAULT_RELAY_AGENT_IDENTIFIER,
  configPath,
  loadConfig,
  saveConfig,
  type HumanCliConfig,
} from '../config';
import { handleError } from './interact';
import { renderQR } from '../qr';
import { pollUntil, sleep } from '../poll';

const CHANNEL_POLL_INTERVAL_MS = 2_000;
const CHANNEL_POLL_TIMEOUT_MS = 5 * 60_000;
const CREDENTIAL_PROPAGATION_TIMEOUT_MS = 30_000;
const BOTFATHER_URL = 'https://t.me/botfather';

interface SetupOptions {
  apiUrl?: string;
  secretKey?: string;
  telegramBotToken?: string;
  agentIdentifier?: string;
}

export async function setupCommand(options: SetupOptions): Promise<never> {
  try {
    const apiUrl = (options.apiUrl ?? process.env.NOVU_API_URL ?? DEFAULT_API_URL).replace(/\/$/, '');
    const existing = loadConfig();

    // 1. Auth — reuse stored credentials, else secret key, else fresh keyless env.
    let auth: HumanCliConfig['auth'];
    const secretKey = options.secretKey ?? process.env.NOVU_SECRET_KEY?.trim();

    if (secretKey) {
      auth = { mode: 'apiKey', secretKey };
    } else if (existing?.apiUrl === apiUrl && existing.auth.mode === 'keyless' && existing.auth.keylessIdentifier) {
      auth = existing.auth;
      info('Reusing your existing keyless session.');
    } else {
      info('Creating a keyless Novu environment (no account needed)...');
      auth = { mode: 'keyless', keylessIdentifier: await bootstrapKeylessSession(apiUrl) };
    }

    const client = createHumanApiClient({
      apiUrl,
      secretKey: auth.secretKey,
      keylessIdentifier: auth.mode === 'keyless' ? auth.keylessIdentifier : undefined,
    });

    // 2. Provision the relay agent + the human's subscriber row.
    const subscriberId =
      existing?.defaultHuman?.subscriberId ?? `human_${randomBytes(6).toString('hex')}`;
    const relayIdentifier = options.agentIdentifier ?? existing?.relayAgentIdentifier ?? DEFAULT_RELAY_AGENT_IDENTIFIER;

    info('Setting up your human relay...');
    const relay = await setupHumanRelay(client, { subscriberId, agentIdentifier: relayIdentifier });

    // 3. Telegram channel.
    const integrationIdentifier = await connectTelegram(client, relay.agentIdentifier, subscriberId, options);

    // 4. Persist config.
    const config: HumanCliConfig = {
      apiUrl,
      auth,
      relayAgentIdentifier: relay.agentIdentifier,
      defaultHuman: { subscriberId, integrationIdentifier, platform: 'telegram' },
    };
    saveConfig(config);
    info(`Saved config to ${configPath()}.`);

    // 5. Smoke test.
    await createInteraction(client, {
      kind: 'tell',
      prompt: "You're connected. Agents can now reach you here — try `human approve \"Deploy to production?\"`.",
      to: subscriberId,
      integrationIdentifier,
      agentIdentifier: relay.agentIdentifier,
    });

    process.stdout.write(
      `\n${pc.green('✔')} Setup complete. Agents on this machine can now run:\n` +
        `  ${pc.bold('human ask "Which environment should I target?"')}\n` +
        `  ${pc.bold('human approve "Deploy to production?"')}\n` +
        `  ${pc.bold('human tell "Build finished."')}\n`
    );
    process.exit(0);
  } catch (err) {
    handleError(err);
  }
}

async function connectTelegram(
  client: HumanApiClient,
  agentIdentifier: string,
  subscriberId: string,
  options: SetupOptions
): Promise<string> {
  // Reuse an existing linked telegram integration when there is one.
  const links = await listAgentIntegrations(client, agentIdentifier);
  const linked = links.find((l) => l.integration.providerId === 'telegram' && l.integration.active !== false);

  let integrationIdentifier = linked?.integration.identifier;

  if (!integrationIdentifier) {
    info('Creating a Telegram integration...');
    const all = await listIntegrations(client);
    const existingIntegration = all.find((i) => i.providerId === 'telegram' && i.channel === 'chat');
    const integration = existingIntegration ?? (await createTelegramIntegration(client, 'Human'));
    integrationIdentifier = integration.identifier;
    await linkAgentIntegration(client, agentIdentifier, integrationIdentifier).catch((err) => {
      if (!(err instanceof HumanApiError) || err.status !== 409) throw err;
    });
  }

  if (await hasChannelEndpoint(client, integrationIdentifier, subscriberId)) {
    info('Telegram already connected.');

    return integrationIdentifier;
  }

  // The integration needs a BotFather token before subscriber links can be minted.
  const botToken = options.telegramBotToken?.trim() ?? (await promptForBotToken());
  const mobileLink = await issueTelegramMobileLink(client, integrationIdentifier, subscriberId);
  await consumeTelegramMobileLink(client, { token: mobileLink.token, botToken });

  const subscriberLink = await issueSubscriberLinkWithRetry(client, integrationIdentifier, subscriberId);

  process.stdout.write(
    `\nScan this QR (or open the link) and tap ${pc.bold('Start')} in Telegram:\n\n` +
      `${renderQR(subscriberLink.deepLinkUrl)}\n\n  ${pc.underline(subscriberLink.deepLinkUrl)}\n\n`
  );

  const connected = await pollUntil(
    async () => ((await hasChannelEndpoint(client, integrationIdentifier as string, subscriberId)) ? 'done' : 'pending'),
    { intervalMs: CHANNEL_POLL_INTERVAL_MS, timeoutMs: CHANNEL_POLL_TIMEOUT_MS }
  );

  if (!connected) {
    throw new Error(
      `We didn't see your /start on @${subscriberLink.botUsername} within ${Math.round(CHANNEL_POLL_TIMEOUT_MS / 1000)}s. Re-run \`npx @novu/human setup\` after tapping Start.`
    );
  }

  info('Telegram connected.');

  return integrationIdentifier;
}

/** The token can take a moment to propagate after save — retry the 422 briefly. */
async function issueSubscriberLinkWithRetry(
  client: HumanApiClient,
  integrationIdentifier: string,
  subscriberId: string
): Promise<{ deepLinkUrl: string; botUsername: string }> {
  const deadline = Date.now() + CREDENTIAL_PROPAGATION_TIMEOUT_MS;

  while (true) {
    try {
      return await issueTelegramSubscriberLink(client, integrationIdentifier, subscriberId);
    } catch (err) {
      const retryable =
        err instanceof HumanApiError && err.status === 422 && /bot token is missing/i.test(err.message);
      if (!retryable || Date.now() >= deadline) throw err;
      await sleep(2_000);
    }
  }
}

async function promptForBotToken(): Promise<string> {
  process.stdout.write(
    `\nCreate a Telegram bot (this is your private line to your agents):\n` +
      `  1. Open ${pc.underline(BOTFATHER_URL)}\n` +
      `  2. Send ${pc.bold('/newbot')} and follow the prompts\n` +
      `  3. Paste the token BotFather gives you below\n\n`
  );

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    for (let attempt = 0; attempt < 5; attempt++) {
      const answer: string = await new Promise((resolve) => {
        rl.question('Telegram bot token: ', resolve);
      });
      const token = answer.trim();
      if (/^\d+:[\w-]+$/.test(token)) return token;
      process.stdout.write(`${pc.yellow('That does not look like a bot token (expected 123456:ABC-...).')}\n`);
    }
  } finally {
    rl.close();
  }

  throw new Error('No valid bot token provided. Re-run `npx @novu/human setup` or pass --telegram-bot-token.');
}

function info(message: string): void {
  process.stdout.write(`${pc.dim('•')} ${message}\n`);
}
