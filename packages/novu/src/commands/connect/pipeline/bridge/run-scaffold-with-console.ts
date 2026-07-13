import chalk from 'chalk';
import type { ConnectUI } from '../../ui/ui';
import type { BridgeScaffoldVariant } from './types';

function bridgeScaffoldLabel(variant: BridgeScaffoldVariant): string {
  if (variant === 'chat-sdk') {
    return 'Chat SDK app';
  }

  if (variant === 'ai-sdk') {
    return 'AI SDK agent app';
  }

  return 'agent app';
}

export async function runScaffoldWithConsole<T>(input: {
  ui: ConnectUI;
  variant: BridgeScaffoldVariant;
  scaffold: () => Promise<T>;
}): Promise<T> {
  if (input.ui.interactive) {
    await input.ui.releaseTerminal();
    console.log(chalk.cyan(`Scaffolding your ${bridgeScaffoldLabel(input.variant)}…`));
    console.log(`${chalk.gray('Installing dependencies — this may take a minute.')}\n`);
  } else {
    input.ui.scaffoldingBridge({ variant: input.variant });
  }

  return input.scaffold();
}
