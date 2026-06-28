import chalk from 'chalk';
import type { ConnectUI } from '../../ui/ui';
import type { BridgeScaffoldVariant } from './types';

export async function runScaffoldWithConsole<T>(input: {
  ui: ConnectUI;
  variant: BridgeScaffoldVariant;
  scaffold: () => Promise<T>;
}): Promise<T> {
  if (input.ui.interactive) {
    await input.ui.releaseTerminal();
    const label = input.variant === 'custom-code' ? 'agent app' : 'Chat SDK app';
    console.log(chalk.cyan(`Scaffolding your ${label}…`));
    console.log(`${chalk.gray('Installing dependencies — this may take a minute.')}\n`);
  } else {
    input.ui.scaffoldingBridge({ variant: input.variant });
  }

  return input.scaffold();
}
