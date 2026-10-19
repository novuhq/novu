import pc from 'picocolors';
import { type Contact, listContacts } from '../api/agent-inbox';
import { loadConfig, NOT_SET_UP_MESSAGE, SUPPORTED_CHANNELS, saveConfig } from '../config';
import { fail } from '../output';
import { clientFromConfig, handleError } from './interact';
import { type SetupOptions, setupCommand } from './setup';

export type ChannelAddOptions = Pick<SetupOptions, 'telegramBotToken' | 'slackConfigToken' | 'email' | 'apiUrl'>;

function requireSetup() {
  const config = loadConfig();

  if (!config?.subscriberId) {
    fail(NOT_SET_UP_MESSAGE);
  }

  return config;
}

function parseChannel(raw: string): string {
  const channel = raw.trim().toLowerCase();

  if (!(SUPPORTED_CHANNELS as readonly string[]).includes(channel)) {
    fail(`Unknown channel "${raw}". Use one of: ${SUPPORTED_CHANNELS.join(', ')}.`);
  }

  return channel;
}

export interface ChannelRow {
  channel: string;
  connectedAt?: string;
  isDefault: boolean;
}

/**
 * The channels the agent can reach the operator on. The default saved on this computer wins over the
 * account's, because the CLI sends it with every message that goes to the operator, also when that
 * channel is not connected. Then no row is the default: the sends fail until it is fixed.
 */
export function toChannelRows(contact: Contact | undefined, savedDefault: string | undefined): ChannelRow[] {
  const channels = contact?.channels ?? [];
  const defaultChannel = savedDefault ?? contact?.defaultVia;

  return channels.map(({ via, connectedAt }) => ({
    channel: via,
    ...(connectedAt ? { connectedAt } : {}),
    isDefault: via === defaultChannel,
  }));
}

export function renderChannels(rows: ChannelRow[], savedDefault: string | undefined): string {
  if (rows.length === 0) {
    return `No channels connected yet. Connect one with: ${pc.bold('npx @agentinbox/cli channel add <telegram|slack|email>')}\n`;
  }

  const width = Math.max(...rows.map((row) => row.channel.length));
  const lines = rows.map((row) => `${row.channel.padEnd(width)}${row.isDefault ? pc.cyan('  (default)') : ''}`);

  if (savedDefault && !rows.some((row) => row.channel === savedDefault)) {
    lines.push(
      '',
      pc.yellow(
        `Your saved default, ${savedDefault}, is not connected, so messages to you fail. Connect it with: npx @agentinbox/cli channel add ${savedDefault}, or pick another with: npx @agentinbox/cli channel default <channel>`
      )
    );
  }

  lines.push(
    '',
    pc.dim(
      'Set default: npx @agentinbox/cli channel default <channel> · connect another: npx @agentinbox/cli channel add <channel>'
    )
  );

  return `${lines.join('\n')}\n`;
}

export async function channelListCommand(options: { json?: boolean; apiUrl?: string }): Promise<never> {
  const { subscriberId, defaultChannel, relayAgentIdentifier } = requireSetup();
  let rows: ChannelRow[];

  try {
    const { client } = clientFromConfig(options.apiUrl);
    const page = await listContacts(client, {
      subscriberId,
      limit: 1,
      ...(relayAgentIdentifier ? { agentIdentifier: relayAgentIdentifier } : {}),
    });
    rows = toChannelRows(page.data[0], defaultChannel);
  } catch (err) {
    return handleError(err);
  }

  if (options.json) {
    const current = rows.find((row) => row.isDefault)?.channel ?? null;
    process.stdout.write(`${JSON.stringify({ data: rows, defaultChannel: current }, null, 2)}\n`);
    process.exit(0);
  }

  process.stdout.write(renderChannels(rows, defaultChannel));
  process.exit(0);
}

/** Connects one more channel to a setup that already exists; the first one is `npx @agentinbox/cli setup`. */
export function channelAddCommand(channelArg: string, options: ChannelAddOptions): Promise<never> {
  requireSetup();

  const channel = parseChannel(channelArg);

  return setupCommand(channel, { ...options, skill: false }, `channel add ${channel}`);
}

export async function channelDefaultCommand(channelArg: string, options: { json?: boolean }): Promise<never> {
  const config = requireSetup();
  const target = parseChannel(channelArg);

  saveConfig({ ...config, defaultChannel: target });

  if (options.json) {
    process.stdout.write(`${JSON.stringify({ defaultChannel: target }, null, 2)}\n`);
    process.exit(0);
  }

  process.stdout.write(
    `Default channel is now ${pc.bold(target)}. Linked channels live on the server — run ${pc.bold(`npx @agentinbox/cli channel add ${target}`)} if it is not connected yet.\n`
  );
  process.exit(0);
}
