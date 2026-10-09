import pc from 'picocolors';
import { loadConfig, NOT_SET_UP_MESSAGE, SUPPORTED_CHANNELS, saveConfig } from '../config';
import { fail } from '../output';
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

export async function channelListCommand(options: { json?: boolean }): Promise<never> {
  const config = requireSetup();

  if (options.json) {
    process.stdout.write(`${JSON.stringify({ defaultChannel: config.defaultChannel ?? null }, null, 2)}\n`);
    process.exit(0);
  }

  if (config.defaultChannel) {
    process.stdout.write(`Default channel: ${pc.bold(config.defaultChannel)}\n`);
  } else {
    process.stdout.write(`${pc.dim('No default channel set — the API uses the first channel you connected.')}\n`);
  }

  process.stdout.write(
    `\n${pc.dim('Set default: human channel default <telegram|slack|email> · connect another: human channel add <channel>')}\n`
  );
  process.exit(0);
}

/** Connects one more channel to a setup that already exists; the first one is `human setup`. */
export function channelAddCommand(channelArg: string, options: ChannelAddOptions): Promise<never> {
  requireSetup();

  return setupCommand(parseChannel(channelArg), { ...options, skill: false });
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
    `Default channel is now ${pc.bold(target)}. Linked channels live on the server — run ${pc.bold(`human channel add ${target}`)} if it is not connected yet.\n`
  );
  process.exit(0);
}
