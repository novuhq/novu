import pc from 'picocolors';
import { loadConfig, saveConfig, NOT_SET_UP_MESSAGE } from '../config';
import { fail } from '../output';

export async function channelsCommand(options: { default?: string; json?: boolean }): Promise<never> {
  const config = loadConfig();

  if (!config || !config.channels?.length) {
    fail(NOT_SET_UP_MESSAGE);
  }

  if (options.default) {
    const target = options.default.toLowerCase();
    const match = config.channels.find((channel) => channel.platform === target);

    if (!match) {
      const linked = config.channels.map((channel) => channel.platform).join(', ');
      fail(`No ${target} channel is linked (linked: ${linked}). Run: human setup ${target}`);
    }

    saveConfig({ ...config, defaultChannel: target });
    process.stdout.write(`Default channel is now ${pc.bold(target)}.\n`);
    process.exit(0);
  }

  if (options.json) {
    process.stdout.write(
      `${JSON.stringify({ defaultChannel: config.defaultChannel, channels: config.channels }, null, 2)}\n`
    );
    process.exit(0);
  }

  for (const channel of config.channels) {
    const isDefault = channel.platform === config.defaultChannel;
    process.stdout.write(
      `${isDefault ? pc.green('●') : pc.dim('○')} ${channel.platform.padEnd(10)} ${pc.dim(channel.integrationIdentifier)}${
        isDefault ? pc.dim('  (default)') : ''
      }\n`
    );
  }
  process.stdout.write(`\n${pc.dim('Switch default: human channels --default <platform> · add: human setup <channel>')}\n`);
  process.exit(0);
}
