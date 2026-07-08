import chalk from 'chalk';
import { printBridgeReconcilePlan } from './print-bridge-reconcile-plan';
import type { BridgeTunnelOfferResult } from './ui';
import { waitForConsoleLine } from './wait-for-console-line';

type BridgeReconcilePlanInput = Parameters<typeof printBridgeReconcilePlan>[0];

export async function promptBridgeReconcilePlanInConsole(opts: BridgeReconcilePlanInput): Promise<void> {
  printBridgeReconcilePlan(opts);
  console.log(chalk.cyan('Press Enter to continue'));

  await waitForConsoleLine();
}

export async function promptBridgeTunnelInConsole(opts: {
  projectDir: string;
  devCommand: string;
}): Promise<BridgeTunnelOfferResult> {
  console.log('');
  console.log(chalk.bold('Start the dev tunnel?'));
  console.log(chalk.dim('Runs your app and registers a public bridge URL with Novu.'));
  console.log(chalk.cyan(`  ${opts.devCommand}`));
  console.log(chalk.cyan('Enter · start tunnel · s · skip'));

  const answer = await waitForConsoleLine();

  if (answer.trim().toLowerCase() === 's') {
    return 'skip';
  }

  return 'accept';
}
