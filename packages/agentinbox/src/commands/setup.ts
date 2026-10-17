import pc from 'picocolors';
import { createInteraction } from '../api/agent-inbox';
import { type ApiClient, createApiClient } from '../api/client';
import { bootstrapKeylessSession } from '../api/setup';
import { info, promptLine, success, warn } from '../cli-io';
import { type CliConfig, configPath, loadConfig, resolveTargetApiUrl, saveConfig } from '../config';
import { openedScreen, openScreen } from '../screen/screen';
import { installSkill, resolveSkillHosts } from '../skills/install-skills';
import { failOnScreen } from './failure';
import { handleError } from './interact';
import { CHANNEL_NAMES, type ChannelName, type ChatChannel } from './link-channel';
import { AgentInboxProvisioningError, announceAgentInbox, connectEmail } from './setup/email';
import {
  channelNameFor,
  type ProvisionedOperator,
  provisionOperator,
  readPictureOption,
  reusableAuth,
  type SetupOptions,
} from './setup/operator';
import { defaultSetupIo, promptChoice, type SetupIo } from './setup/prompts';
import { connectSlack } from './setup/slack';
import { connectTelegram } from './setup/telegram';

export type { SetupOptions } from './setup/operator';
export { reusableAuth } from './setup/operator';

/** `command` is how the screen names it: `setup`, `setup telegram`, or `channel add slack` when that runs it. */
export async function setupCommand(
  channelArg: string | undefined,
  options: SetupOptions,
  command = channelArg ? `setup ${channelArg}` : 'setup'
): Promise<never> {
  const screen = await openScreen({ command });

  try {
    await runSetup(parseSetupChannel(channelArg), options);
    await screen?.done('happy');
    process.exit(0);
  } catch (err) {
    if (screen) {
      await failOnScreen(screen, err);
    }
    handleError(err);
  }
}

async function runSetup(channel: ChannelName | undefined, options: SetupOptions): Promise<void> {
  const picture = await readPictureOption(options);
  const existing = loadConfig();
  const apiUrl = resolveTargetApiUrl(options.apiUrl, existing);
  const auth = await resolveSetupAuth(existing, apiUrl, options.secretKey ?? process.env.INBOX_SECRET_KEY?.trim());
  const client = createApiClient({
    apiUrl,
    secretKey: auth.secretKey,
    keylessIdentifier: auth.mode === 'keyless' ? auth.keylessIdentifier : undefined,
  });
  const provisioned = await provisionOperator(client, existing, options, picture);

  // The inbox always exists after setup, but only a verified address makes it
  // a channel the person can be reached on. A deployment with email disabled
  // must still be able to connect Telegram or Slack.
  const verifyEmail = channel === 'email' || (client.isKeyless && !channel);
  try {
    await linkInbox(client, verifyEmail, provisioned, options);
  } catch (err) {
    if (channel === 'email' || !(err instanceof AgentInboxProvisioningError)) {
      throw err instanceof AgentInboxProvisioningError ? err.original : err;
    }

    warn(`Could not set up the email inbox (${err.message}). Chat setup can continue.`);
  }
  const chat = await resolveChatChannel(channel);
  if (chat) {
    await connectChannel(client, chat, provisioned.relay, channelNameFor(provisioned.relay), provisioned.subscriberId, {
      ...options,
      ...(provisioned.operatorEmail ? { email: provisioned.operatorEmail } : {}),
    });
  }

  const linked = channelLinkedBySetup(chat, verifyEmail, client.isKeyless);
  saveSetupConfig(apiUrl, auth, existing, provisioned, linked);
  await confirmLinkedChannel(client, linked, provisioned);

  if (auth.mode === 'keyless') {
    info(
      `This is a free demo without an account. Run ${pc.bold('npx @agentinbox/cli login')} anytime to keep it in a Agent Inbox account.`
    );
  }

  await maybeInstallSkill(options);
}

async function resolveSetupAuth(
  existing: CliConfig | null,
  apiUrl: string,
  secretKey: string | undefined
): Promise<CliConfig['auth']> {
  const auth = reusableAuth(existing, apiUrl, secretKey);
  if (!auth) {
    info('Creating a keyless inbox (no account needed)...');

    return { mode: 'keyless', keylessIdentifier: await bootstrapKeylessSession(apiUrl) };
  }

  if (!secretKey) {
    info(auth.mode === 'keyless' ? 'Reusing your existing keyless session.' : 'Using your saved login.');
  }

  return auth;
}

async function linkInbox(
  client: ApiClient,
  verifyEmail: boolean,
  provisioned: ProvisionedOperator,
  options: SetupOptions
): Promise<void> {
  if (verifyEmail) {
    await connectEmail(client, provisioned.relay.agentIdentifier, provisioned.subscriberId, {
      ...options,
      ...(provisioned.operatorEmail ? { email: provisioned.operatorEmail } : {}),
    });

    return;
  }

  await announceAgentInbox(client, provisioned.relay.agentIdentifier);
}

/** Telegram or Slack from the command, or a prompt after the inbox exists. Enter skips. */
async function resolveChatChannel(channel: ChannelName | undefined): Promise<ChatChannel | undefined> {
  if (channel === 'telegram' || channel === 'slack') {
    return channel;
  }

  return offerChatChannel();
}

async function offerChatChannel(io: SetupIo = defaultSetupIo): Promise<ChatChannel | undefined> {
  if (!io.isTTY) {
    return undefined;
  }

  return promptChoice<ChatChannel>(
    io,
    {
      heading: 'Also connect a chat channel? Press Enter to skip.',
      question: 'Channel [1, 2, or Enter]: ',
      retry: 'Pick 1 for Telegram, 2 for Slack, or press Enter to skip.',
    },
    [
      { label: 'Telegram', aliases: ['telegram'], value: 'telegram' },
      { label: 'Slack', aliases: ['slack'], value: 'slack' },
    ],
    { skippable: true }
  );
}

/**
 * The channel this run made usable. A verified keyless address still cannot
 * send, so it is not saved as the default — a later chat setup would keep it.
 */
export function channelLinkedBySetup(
  chat: ChatChannel | undefined,
  verifyEmail: boolean,
  keyless: boolean
): ChannelName | undefined {
  if (chat) {
    return chat;
  }

  if (verifyEmail && !keyless) {
    return 'email';
  }

  return undefined;
}

function saveSetupConfig(
  apiUrl: string,
  auth: CliConfig['auth'],
  existing: CliConfig | null,
  provisioned: ProvisionedOperator,
  channel: ChannelName | undefined
): void {
  // A contact switch invalidates the saved default; otherwise keep it and fall
  // back to whatever this run actually linked.
  const keptDefault = provisioned.switchedContact ? undefined : existing?.defaultChannel;
  const defaultChannel = keptDefault ?? channel;
  saveConfig({
    apiUrl,
    auth,
    relayAgentIdentifier: provisioned.relay.agentIdentifier,
    subscriberId: provisioned.subscriberId,
    ...(defaultChannel ? { defaultChannel } : {}),
  });
  success(`Saved config to ${configPath()}.`);

  if (channel && defaultChannel && defaultChannel !== channel) {
    info(
      `Your default channel is still ${pc.bold(defaultChannel)} — switch with: npx @agentinbox/cli channel default ${channel}`
    );
  }
}

async function confirmLinkedChannel(
  client: ApiClient,
  channel: ChannelName | undefined,
  provisioned: ProvisionedOperator
): Promise<void> {
  if (!channel || (client.isKeyless && channel === 'email')) {
    return;
  }

  const { name } = provisioned;
  await createInteraction(client, {
    kind: 'tell',
    card: {
      title: `${name ? `Hi ${name.firstName}, you're` : "You're"} connected. Agents can now reach you here — try \`npx @agentinbox/cli inbox send approve "Deploy to production?"\`.`,
    },
    to: provisioned.subscriberId,
    via: channel,
    agentIdentifier: provisioned.relay.agentIdentifier,
  });

  const examples = [
    'npx @agentinbox/cli inbox send ask "Which environment should I target?"',
    'npx @agentinbox/cli inbox send approve "Deploy to production?"',
    'npx @agentinbox/cli inbox send "Build finished."',
  ];
  const screen = openedScreen();

  if (screen) {
    screen.subtitle(`${channel[0].toUpperCase()}${channel.slice(1)} connected. Agents on this machine can now run:`);
    screen.add(...examples.map((example) => ({ mark: 'next' as const, value: pc.bold(example) })));
    screen.feel('happy');

    return;
  }

  process.stdout.write(
    `\n${pc.green('✔')} ${channel} connected. Agents on this machine can now run:\n` +
      examples.map((example) => `  ${pc.bold(example)}\n`).join('')
  );
}

/**
 * Offers to teach the coding agent running in this project (Claude Code,
 * Cursor, ...) when to reach for the inbox. Explicit `--skill`/`--no-skill`
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

    const answer = (await promptLine('\nTeach your coding agent how to use the inbox? [Y/n] ')).trim().toLowerCase();
    if (answer === 'n' || answer === 'no') {
      return;
    }
  }

  try {
    const installed = installSkill(process.cwd(), resolveSkillHosts(process.cwd()));
    if (installed.length === 0) {
      return;
    }

    success(`Installed the agent-inbox skill: ${installed.map((entry) => entry.destination).join(', ')}`);
  } catch (err) {
    // Non-fatal — setup itself already succeeded.
    const message = `Could not install the coding-agent skill (${err instanceof Error ? err.message : String(err)}). Run \`npx @agentinbox/cli skill install\` later.`;
    const screen = openedScreen();
    if (screen) {
      screen.add({ mark: 'failed', value: message });
    } else {
      process.stdout.write(`${pc.yellow('•')} ${message}\n`);
    }
  }
}

async function connectChannel(
  client: ApiClient,
  channel: ChatChannel,
  relay: { agentId: string; agentIdentifier: string },
  agentName: string,
  subscriberId: string,
  options: SetupOptions
): Promise<string> {
  switch (channel) {
    case 'telegram':
      return connectTelegram(client, relay.agentIdentifier, agentName, subscriberId, options);
    case 'slack':
      return connectSlack(
        client,
        { id: relay.agentId, identifier: relay.agentIdentifier, name: agentName },
        subscriberId,
        options
      );
    default: {
      const unhandled: never = channel;
      throw new Error(`Unsupported channel: ${String(unhandled)}`);
    }
  }
}

/** A channel argument adds Telegram, Slack, or account email verification. Omitted, setup is the inbox. */
function parseSetupChannel(channelArg: string | undefined): ChannelName | undefined {
  if (!channelArg) {
    return undefined;
  }

  const normalized = channelArg.toLowerCase();
  if ((CHANNEL_NAMES as readonly string[]).includes(normalized)) {
    return normalized as ChannelName;
  }

  if (normalized === 'whatsapp') {
    throw new Error(
      'whatsapp is not supported by `npx @agentinbox/cli setup` yet — use telegram, slack, or email for now.'
    );
  }

  throw new Error(`Unknown channel "${channelArg}". Supported: ${CHANNEL_NAMES.join(', ')}.`);
}
