import pc from 'picocolors';
import { createHumanApiClient, type HumanApiClient } from '../api/client';
import { createInteraction } from '../api/human';
import { bootstrapKeylessSession } from '../api/setup';
import { info, promptLine } from '../cli-io';
import { configPath, type HumanCliConfig, loadConfig, resolveTargetApiUrl, saveConfig } from '../config';
import { installHumanSkill, resolveSkillHosts } from '../skills/install-skills';
import { handleError } from './interact';
import { type ChatChannel, HUMAN_CHANNELS, type HumanChannel } from './link-channel';
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

export async function setupCommand(channelArg: string | undefined, options: SetupOptions): Promise<never> {
  try {
    await runSetup(parseSetupChannel(channelArg), options);
    process.exit(0);
  } catch (err) {
    handleError(err);
  }
}

async function runSetup(channel: HumanChannel | undefined, options: SetupOptions): Promise<void> {
  const picture = await readPictureOption(options);
  const existing = loadConfig();
  const apiUrl = resolveTargetApiUrl(options.apiUrl, existing);
  const auth = await resolveSetupAuth(existing, apiUrl, options.secretKey ?? process.env.NOVU_SECRET_KEY?.trim());
  const client = createHumanApiClient({
    apiUrl,
    secretKey: auth.secretKey,
    keylessIdentifier: auth.mode === 'keyless' ? auth.keylessIdentifier : undefined,
  });
  const provisioned = await provisionOperator(client, existing, options, picture);

  // The inbox always exists after setup, but only a verified address makes it
  // a channel the human can be reached on. A deployment with email disabled
  // must still be able to connect Telegram or Slack.
  const verifyEmail = channel === 'email' || (client.isKeyless && !channel);
  try {
    await linkInbox(client, verifyEmail, provisioned, options);
  } catch (err) {
    if (channel === 'email' || !(err instanceof AgentInboxProvisioningError)) {
      throw err instanceof AgentInboxProvisioningError ? err.original : err;
    }

    info(pc.yellow(`Could not set up the email inbox (${err.message}). Chat setup can continue.`));
  }
  const chat = await resolveChatChannel(channel);
  if (chat) {
    await connectChannel(client, chat, provisioned.relay, channelNameFor(provisioned.relay), provisioned.subscriberId, {
      ...options,
      ...(provisioned.operatorEmail ? { email: provisioned.operatorEmail } : {}),
    });
  }

  const linked: HumanChannel | undefined = chat ?? (verifyEmail ? 'email' : undefined);
  saveSetupConfig(apiUrl, auth, existing, provisioned, linked);
  await confirmLinkedChannel(client, linked, provisioned);

  if (auth.mode === 'keyless') {
    info(
      `This is a free demo without an account. Run ${pc.bold('human login')} anytime to keep it in a Human account.`
    );
  }

  await maybeInstallSkill(options);
}

async function resolveSetupAuth(
  existing: HumanCliConfig | null,
  apiUrl: string,
  secretKey: string | undefined
): Promise<HumanCliConfig['auth']> {
  const auth = reusableAuth(existing, apiUrl, secretKey);
  if (!auth) {
    info('Creating a keyless Novu environment (no account needed)...');

    return { mode: 'keyless', keylessIdentifier: await bootstrapKeylessSession(apiUrl) };
  }

  if (!secretKey) {
    info(auth.mode === 'keyless' ? 'Reusing your existing keyless session.' : 'Using your saved login.');
  }

  return auth;
}

async function linkInbox(
  client: HumanApiClient,
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
async function resolveChatChannel(channel: HumanChannel | undefined): Promise<ChatChannel | undefined> {
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

function saveSetupConfig(
  apiUrl: string,
  auth: HumanCliConfig['auth'],
  existing: HumanCliConfig | null,
  provisioned: ProvisionedOperator,
  channel: HumanChannel | undefined
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
  info(`Saved config to ${configPath()}.`);

  if (channel && defaultChannel && defaultChannel !== channel) {
    info(`Your default channel is still ${pc.bold(defaultChannel)} — switch with: human channels --default ${channel}`);
  }
}

async function confirmLinkedChannel(
  client: HumanApiClient,
  channel: HumanChannel | undefined,
  provisioned: ProvisionedOperator
): Promise<void> {
  if (!channel || (client.isKeyless && channel === 'email')) {
    return;
  }

  const { name } = provisioned;
  await createInteraction(client, {
    kind: 'tell',
    card: {
      title: `${name ? `Hi ${name.firstName}, you're` : "You're"} connected. Agents can now reach you here — try \`human approve "Deploy to production?"\`.`,
    },
    to: provisioned.subscriberId,
    via: channel,
    agentIdentifier: provisioned.relay.agentIdentifier,
  });

  process.stdout.write(
    `\n${pc.green('✔')} ${channel} connected. Agents on this machine can now run:\n` +
      `  ${pc.bold('human ask "Which environment should I target?"')}\n` +
      `  ${pc.bold('human approve "Deploy to production?"')}\n` +
      `  ${pc.bold('human tell "Build finished."')}\n`
  );
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

async function connectChannel(
  client: HumanApiClient,
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
function parseSetupChannel(channelArg: string | undefined): HumanChannel | undefined {
  if (!channelArg) {
    return undefined;
  }

  const normalized = channelArg.toLowerCase();
  if ((HUMAN_CHANNELS as readonly string[]).includes(normalized)) {
    return normalized as HumanChannel;
  }

  if (normalized === 'whatsapp') {
    throw new Error('whatsapp is not supported by `human setup` yet — use telegram, slack, or email for now.');
  }

  throw new Error(`Unknown channel "${channelArg}". Supported: ${HUMAN_CHANNELS.join(', ')}.`);
}
