import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import pc from 'picocolors';
import { createHumanApiClient, type HumanApiClient, HumanApiError } from '../api/client';
import { createInteraction, setupHumanRelay } from '../api/human';
import {
  addAgentEmailIntegration,
  bootstrapKeylessSession,
  consumeTelegramMobileLink,
  createSlackIntegration,
  createTelegramIntegration,
  generateConnectOauthUrl,
  getSlackSetupLinkStatus,
  hasChannelEndpoint,
  type IntegrationRecord,
  issueSlackSetupLink,
  issueTelegramMobileLink,
  linkAgentIntegration,
  listAgentIntegrations,
  listIntegrations,
  slackQuickSetup,
} from '../api/setup';
import { info, promptLine } from '../cli-io';
import {
  configPath,
  DEFAULT_API_URL,
  DEFAULT_RELAY_AGENT_IDENTIFIER,
  type HumanCliConfig,
  loadConfig,
  saveConfig,
} from '../config';
import { pollUntil, sleep } from '../poll';
import { renderQR } from '../qr';
import { installHumanSkill, resolveSkillHosts } from '../skills/install-skills';
import { handleError } from './interact';
import { splitName } from './invite';
import {
  CHANNEL_POLL_INTERVAL_MS,
  CHANNEL_POLL_TIMEOUT_MS,
  CREDENTIAL_PROPAGATION_TIMEOUT_MS,
  HUMAN_CHANNELS,
  type HumanChannel,
  isMissingSlackCredentialsError,
  issueTelegramSubscriberLinkWithRetry,
  parseEmailAddress,
  waitForEndpoint,
} from './link-channel';

const BOTFATHER_URL = 'https://t.me/botfather';

/**
 * `--name` always wins. Otherwise ask once — only on the very first setup
 * (no subscriberId in config yet) and only on a TTY; an empty answer or a
 * non-interactive run just leaves the name unset.
 */
export async function resolveOperatorName(
  options: Pick<SetupOptions, 'name'>,
  alreadySetUp: boolean,
  io: { isTTY: boolean; prompt: (question: string) => Promise<string> } = {
    isTTY: Boolean(process.stdin.isTTY),
    prompt: promptLine,
  }
): Promise<{ firstName: string; lastName?: string } | undefined> {
  if (options.name !== undefined) {
    return splitName(options.name);
  }

  if (alreadySetUp || !io.isTTY) {
    return undefined;
  }

  return splitName(await io.prompt('Your name (shown to agents, optional): '));
}

interface SetupOptions {
  apiUrl?: string;
  secretKey?: string;
  telegramBotToken?: string;
  slackConfigToken?: string;
  email?: string;
  /** Your display name; skips the first-run prompt. */
  name?: string;
  agentIdentifier?: string;
  /** Tri-state: undefined = ask (TTY) / skip (non-TTY); true/false = explicit `--skill`/`--no-skill`. */
  skill?: boolean;
}

export async function setupCommand(channelArg: string | undefined, options: SetupOptions): Promise<never> {
  try {
    const channel = await resolveChannelChoice(channelArg);
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
    const subscriberId = existing?.subscriberId ?? `human_${randomBytes(6).toString('hex')}`;
    const relayIdentifier = options.agentIdentifier ?? existing?.relayAgentIdentifier ?? DEFAULT_RELAY_AGENT_IDENTIFIER;
    const name = await resolveOperatorName(options, Boolean(existing?.subscriberId));

    info('Setting up your human relay...');
    const relay = await setupHumanRelay(client, { subscriberId, agentIdentifier: relayIdentifier, ...name });

    // 3. Channel linking — linked channels live on the server; locally we only
    // remember a default preference for when the caller does not pass `--via`.
    await (channel === 'telegram'
      ? connectTelegram(client, relay.agentIdentifier, subscriberId, options)
      : channel === 'slack'
        ? connectSlack(client, relay.agentId, relay.agentIdentifier, subscriberId, options)
        : connectEmail(client, relay.agentIdentifier, subscriberId, options));

    // 4. Persist config — first setup becomes the default preference.
    const defaultChannel = existing?.defaultChannel ?? channel;

    const config: HumanCliConfig = {
      apiUrl,
      auth,
      relayAgentIdentifier: relay.agentIdentifier,
      subscriberId,
      defaultChannel,
    };
    saveConfig(config);
    info(`Saved config to ${configPath()}.`);

    if (defaultChannel !== channel) {
      info(
        `Your default channel is still ${pc.bold(defaultChannel)} — switch with: human channels --default ${channel}`
      );
    }

    // 5. Smoke test on the channel that was just linked.
    await createInteraction(client, {
      kind: 'tell',
      prompt: `${name ? `Hi ${name.firstName}, you're` : "You're"} connected. Agents can now reach you here — try \`human approve "Deploy to production?"\`.`,
      to: subscriberId,
      via: channel,
      agentIdentifier: relay.agentIdentifier,
    });

    process.stdout.write(
      `\n${pc.green('✔')} ${channel} connected. Agents on this machine can now run:\n` +
        `  ${pc.bold('human ask "Which environment should I target?"')}\n` +
        `  ${pc.bold('human approve "Deploy to production?"')}\n` +
        `  ${pc.bold('human tell "Build finished."')}\n`
    );

    await maybeInstallSkill(options);
    process.exit(0);
  } catch (err) {
    handleError(err);
  }
}

/**
 * Offers to teach the coding agent running in this project (Claude Code,
 * Cursor, ...) when to reach for `human`. Explicit `--skill`/`--no-skill`
 * always wins; otherwise this prompts on a TTY and stays silent (no install)
 * in headless runs, since dropping files into a CI checkout is a surprise.
 */
async function maybeInstallSkill(options: SetupOptions): Promise<void> {
  if (options.skill === false) {
    return;
  }

  if (options.skill !== true) {
    if (!process.stdin.isTTY) {
      return;
    }

    const answer = (await promptLine('\nTeach your coding agent how to use `human`? [Y/n] ')).trim().toLowerCase();
    if (answer === 'n' || answer === 'no') {
      return;
    }
  }

  try {
    const installed = installHumanSkill(process.cwd(), resolveSkillHosts(process.cwd()));
    if (installed.length === 0) {
      return;
    }

    info(`Installed the human-cli skill: ${installed.map((entry) => entry.destination).join(', ')}`);
  } catch (err) {
    // Non-fatal — setup itself already succeeded.
    process.stdout.write(
      `${pc.yellow('•')} Could not install the coding-agent skill (${err instanceof Error ? err.message : String(err)}). Run \`human skill install\` later.\n`
    );
  }
}

async function resolveChannelChoice(channelArg: string | undefined): Promise<HumanChannel> {
  if (channelArg) {
    const normalized = channelArg.toLowerCase();
    if ((HUMAN_CHANNELS as readonly string[]).includes(normalized)) {
      return normalized as HumanChannel;
    }

    if (normalized === 'whatsapp') {
      throw new Error('whatsapp is not supported by `human setup` yet — use telegram, slack, or email for now.');
    }

    throw new Error(`Unknown channel "${channelArg}". Supported: ${HUMAN_CHANNELS.join(', ')}.`);
  }

  if (!process.stdin.isTTY) {
    throw new Error(`Pass a channel when running non-interactively: human setup <${HUMAN_CHANNELS.join('|')}>`);
  }

  process.stdout.write(
    `\nWhere should agents reach you?\n` +
      `  ${pc.bold('1')}. Telegram ${pc.dim('(fastest — a private bot, QR link)')}\n` +
      `  ${pc.bold('2')}. Slack    ${pc.dim('(your workspace — app install)')}\n` +
      `  ${pc.bold('3')}. Email    ${pc.dim('(buttons in your inbox, reply to answer)')}\n\n`
  );

  const answer = await promptLine(`Channel [1-${HUMAN_CHANNELS.length}]: `);
  const index = Number(answer.trim()) - 1;
  const byNumber = HUMAN_CHANNELS[index];
  if (byNumber) return byNumber;

  const byName = HUMAN_CHANNELS.find((name) => name === answer.trim().toLowerCase());
  if (byName) return byName;

  throw new Error(`Pick 1-${HUMAN_CHANNELS.length} (or run: human setup <${HUMAN_CHANNELS.join('|')}>).`);
}

// --- Telegram -------------------------------------------------------------

async function connectTelegram(
  client: HumanApiClient,
  agentIdentifier: string,
  subscriberId: string,
  options: SetupOptions
): Promise<string> {
  const integrationIdentifier = await resolveLinkedIntegration(client, agentIdentifier, 'telegram', () =>
    createTelegramIntegration(client, 'Human')
  );

  if (await hasChannelEndpoint(client, integrationIdentifier, subscriberId)) {
    info('Telegram already connected.');

    return integrationIdentifier;
  }

  // The integration needs a BotFather token before subscriber links can be minted.
  const botToken = options.telegramBotToken?.trim() ?? (await promptForBotToken());
  const mobileLink = await issueTelegramMobileLink(client, integrationIdentifier, subscriberId);
  await consumeTelegramMobileLink(client, { token: mobileLink.token, botToken });

  const subscriberLink = await issueTelegramSubscriberLinkWithRetry(client, integrationIdentifier, subscriberId);

  process.stdout.write(
    `\nScan this QR (or open the link) and tap ${pc.bold('Start')} in Telegram:\n\n` +
      `${renderQR(subscriberLink.deepLinkUrl)}\n\n  ${pc.underline(subscriberLink.deepLinkUrl)}\n\n`
  );

  await waitForEndpoint(client, integrationIdentifier, subscriberId, `your /start on @${subscriberLink.botUsername}`);
  info('Telegram connected.');

  return integrationIdentifier;
}

// --- Email ------------------------------------------------------------------

/**
 * Email needs no linking dance: the relay gets a per-agent Novu Email
 * integration with a shared inbound address, and the human's identity is
 * their email on the subscriber (delivery target + inbound reply resolution —
 * no ChannelEndpoint involved).
 */
async function connectEmail(
  client: HumanApiClient,
  agentIdentifier: string,
  subscriberId: string,
  options: SetupOptions
): Promise<string> {
  info('Creating an email integration...');
  const link = await addAgentEmailIntegration(client, agentIdentifier);
  const integrationIdentifier = link.integration.identifier;
  const inboundAddress = link.integration.sharedInboundAddress;

  if (!options.email && !process.stdin.isTTY) {
    throw new Error('Pass --email <address> when running `human setup email` non-interactively.');
  }

  const email = options.email?.trim() ? parseEmailAddress(options.email) : await promptForEmail();
  if (!email) {
    throw new Error('No valid email address provided. Re-run `human setup email` or pass --email.');
  }

  info('Registering your email address...');
  await setupHumanRelay(client, { subscriberId, agentIdentifier, email });

  if (inboundAddress) {
    info(`Replies go to ${pc.bold(inboundAddress)} — answering an interaction is just replying to its email.`);
  }

  return integrationIdentifier;
}

async function promptForEmail(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const email = parseEmailAddress(await promptLine('Your email address: '));
    if (email) return email;
    process.stdout.write(`${pc.yellow('That does not look like an email address.')}\n`);
  }

  throw new Error('No valid email address provided. Re-run `human setup email` or pass --email.');
}

// --- Slack ----------------------------------------------------------------

async function connectSlack(
  client: HumanApiClient,
  agentId: string,
  agentIdentifier: string,
  subscriberId: string,
  options: SetupOptions
): Promise<string> {
  const integration = await resolveLinkedSlackIntegration(client, agentIdentifier);

  if (await hasChannelEndpoint(client, integration.identifier, subscriberId)) {
    info('Slack already connected.');

    return integration.identifier;
  }

  const authorizeUrl = await buildSlackAuthorizeUrl(
    client,
    agentId,
    agentIdentifier,
    integration,
    subscriberId,
    options
  );

  process.stdout.write(
    `\nAuthorize the Slack app in your workspace (opening your browser):\n\n  ${pc.underline(authorizeUrl)}\n\n`
  );
  openInBrowser(authorizeUrl);

  await waitForEndpoint(client, integration.identifier, subscriberId, 'the Slack install to complete');
  info('Slack connected.');

  return integration.identifier;
}

/**
 * Builds the Slack authorize URL, falling back to quick-setup (creating the
 * Slack app from an App Configuration Token) when the integration has no
 * credentials yet — same dance as `novu connect`.
 */
async function buildSlackAuthorizeUrl(
  client: HumanApiClient,
  agentId: string,
  agentIdentifier: string,
  integration: IntegrationRecord,
  subscriberId: string,
  options: SetupOptions
): Promise<string> {
  const buildUrl = () =>
    generateConnectOauthUrl(client, {
      integrationIdentifier: integration.identifier,
      agentIdentifier,
      subscriberId,
    });

  try {
    return await buildUrl();
  } catch (err) {
    if (!isMissingSlackCredentialsError(err)) throw err;
  }

  await runSlackQuickSetup(client, agentId, agentIdentifier, integration, options);

  // Credentials can take a moment to become readable after the app is created.
  const deadline = Date.now() + CREDENTIAL_PROPAGATION_TIMEOUT_MS;
  while (true) {
    try {
      return await buildUrl();
    } catch (err) {
      if (!isMissingSlackCredentialsError(err) || Date.now() >= deadline) throw err;
      await sleep(2_000);
    }
  }
}

async function runSlackQuickSetup(
  client: HumanApiClient,
  agentId: string,
  agentIdentifier: string,
  integration: IntegrationRecord,
  options: SetupOptions
): Promise<void> {
  const tokenFromFlag = options.slackConfigToken?.trim();

  if (tokenFromFlag) {
    const formatError = validateSlackConfigTokenFormat(tokenFromFlag);
    if (formatError) throw new Error(formatError);
    info('Creating the Slack app...');
    await slackQuickSetup(client, integration._id, { configToken: tokenFromFlag, agentId });

    return;
  }

  if (process.stdin.isTTY) {
    await promptAndRunSlackQuickSetup(client, agentId, integration);

    return;
  }

  // Headless: hand the human a secure setup page and wait for the token there.
  const setupLink = await issueSlackSetupLink(client, agentIdentifier, integration._id);
  process.stdout.write(`\nOpen this page and paste your Slack App Configuration Token:\n  ${setupLink.url}\n\n`);

  const saved = await pollUntil(
    async () => {
      const status = await getSlackSetupLinkStatus(client, setupLink.token);
      if (!status.valid && status.reason === 'used') return 'done';
      if (!status.valid) return 'failed';

      return 'pending';
    },
    { intervalMs: CHANNEL_POLL_INTERVAL_MS, timeoutMs: CHANNEL_POLL_TIMEOUT_MS }
  );

  if (!saved) {
    throw new Error('The Slack setup link expired or was not completed. Re-run `human setup slack` for a fresh link.');
  }
}

async function promptAndRunSlackQuickSetup(
  client: HumanApiClient,
  agentId: string,
  integration: IntegrationRecord
): Promise<void> {
  process.stdout.write(
    `\nSlack needs a one-time App Configuration Token to create your app:\n` +
      `  1. Open ${pc.underline('https://api.slack.com/apps')}\n` +
      `  2. Scroll to ${pc.bold('Your App Configuration Tokens')} and generate one\n` +
      `  3. Paste the ${pc.bold('xoxe.xoxp-...')} token below\n\n`
  );

  for (let attempt = 0; attempt < 5; attempt++) {
    const token = (await promptLine('Slack App Configuration Token: ')).trim();
    const formatError = validateSlackConfigTokenFormat(token);
    if (formatError) {
      process.stdout.write(`${pc.yellow(formatError)}\n`);
      continue;
    }

    try {
      info('Creating the Slack app...');
      await slackQuickSetup(client, integration._id, { configToken: token, agentId });

      return;
    } catch (err) {
      if (!(err instanceof HumanApiError) || err.status === 0 || err.status >= 500) throw err;
      process.stdout.write(`${pc.yellow(err.message)}\n`);
    }
  }

  throw new Error(
    'Slack did not accept the App Configuration Token. Generate a fresh one and re-run `human setup slack`.'
  );
}

/** Wrong-token-type guardrails, mirrored from `novu connect`. */
function validateSlackConfigTokenFormat(token: string): string | undefined {
  if (!token) return 'Paste an App Configuration Token to continue.';
  if (token.startsWith('xoxb-'))
    return 'That looks like a bot token (xoxb-). App Configuration Tokens start with xoxe.xoxp-.';
  if (token.startsWith('xapp-'))
    return 'That looks like an app-level token (xapp-). App Configuration Tokens start with xoxe.xoxp-.';
  if (token.startsWith('xoxp-') && !token.startsWith('xoxe.'))
    return 'That looks like a user token (xoxp-). App Configuration Tokens start with xoxe.xoxp-.';
  if (!token.startsWith('xoxe.'))
    return 'App Configuration Tokens start with xoxe. — generate one at the bottom of api.slack.com/apps.';

  return undefined;
}

// --- shared helpers ---------------------------------------------------------

/** Reuse an integration already linked to the relay, else create + link one. */
async function resolveLinkedIntegration(
  client: HumanApiClient,
  agentIdentifier: string,
  providerId: string,
  create: () => Promise<IntegrationRecord>
): Promise<string> {
  const links = await listAgentIntegrations(client, agentIdentifier);
  const linked = links.find((l) => l.integration.providerId === providerId && l.integration.active !== false);
  if (linked) return linked.integration.identifier;

  info(`Creating a ${providerId} integration...`);
  const all = await listIntegrations(client);
  const existing = all.find((i) => i.providerId === providerId && i.channel === 'chat');
  const integration = existing ?? (await create());
  await linkAgentIntegration(client, agentIdentifier, integration.identifier).catch((err) => {
    if (!(err instanceof HumanApiError) || err.status !== 409) throw err;
  });

  return integration.identifier;
}

/** Slack needs the full integration record (`_id` for quick-setup), not just the identifier. */
async function resolveLinkedSlackIntegration(
  client: HumanApiClient,
  agentIdentifier: string
): Promise<IntegrationRecord> {
  const identifier = await resolveLinkedIntegration(client, agentIdentifier, 'slack', () =>
    createSlackIntegration(client, 'Human')
  );
  const all = await listIntegrations(client);
  const integration = all.find((i) => i.identifier === identifier);

  if (!integration) {
    throw new Error(`Slack integration "${identifier}" was linked but could not be loaded.`);
  }

  return integration;
}

async function promptForBotToken(): Promise<string> {
  process.stdout.write(
    `\nCreate a Telegram bot (this is your private line to your agents):\n` +
      `  1. Open ${pc.underline(BOTFATHER_URL)}\n` +
      `  2. Send ${pc.bold('/newbot')} and follow the prompts\n` +
      `  3. Paste the token BotFather gives you below\n\n`
  );

  for (let attempt = 0; attempt < 5; attempt++) {
    const token = (await promptLine('Telegram bot token: ')).trim();
    if (/^\d+:[\w-]+$/.test(token)) return token;
    process.stdout.write(`${pc.yellow('That does not look like a bot token (expected 123456:ABC-...).')}\n`);
  }

  throw new Error('No valid bot token provided. Re-run `human setup telegram` or pass --telegram-bot-token.');
}

/** Best-effort platform browser open — the URL is always printed as fallback. */
function openInBrowser(url: string): void {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';

  try {
    spawn(command, [url], { stdio: 'ignore', detached: true })
      .on('error', () => undefined)
      .unref();
  } catch {
    // URL is printed above — the human can click it.
  }
}
