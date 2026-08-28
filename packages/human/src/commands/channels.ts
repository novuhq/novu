import pc from 'picocolors';
import { loadConfig, NOT_SET_UP_MESSAGE, saveConfig } from '../config';
import { fail } from '../output';

const SUPPORTED = ['telegram', 'slack', 'email'] as const;

export async function channelsCommand(options: { default?: string; json?: boolean }): Promise<never> {
  const config = loadConfig();

  if (!config?.subscriberId) {
    fail(NOT_SET_UP_MESSAGE);
  }

  if (options.default) {
    const target = options.default.toLowerCase();
    if (!(SUPPORTED as readonly string[]).includes(target)) {
      fail(`Unknown channel "${target}". Use one of: ${SUPPORTED.join(', ')}.`);
    }

    saveConfig({ ...config, defaultChannel: target });
    process.stdout.write(
      `Default channel is now ${pc.bold(target)}. Linked channels live on the server — run ${pc.bold(`human setup ${target}`)} if it is not connected yet.\n`
    );
    process.exit(0);
  }

  if (options.json) {
    process.stdout.write(`${JSON.stringify({ defaultChannel: config.defaultChannel ?? null }, null, 2)}\n`);
    process.exit(0);
  }

  if (config.defaultChannel) {
    process.stdout.write(`Default channel: ${pc.bold(config.defaultChannel)}\n`);
  } else {
    process.stdout.write(`${pc.dim('No default channel set — the API picks when only one channel is linked.')}\n`);
  }

  process.stdout.write(
    `\n${pc.dim('Set default: human channels --default <telegram|slack|email> · link: human setup <channel>')}\n`
  );
  process.exit(0);
}
