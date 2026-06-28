import { stdin as input, stdout as output } from 'node:process';
import * as readline from 'node:readline/promises';
import chalk from 'chalk';
import { printChatSdkReconcilePlan } from './print-chat-sdk-reconcile-plan';
import type { ChatSdkTunnelOfferResult } from './ui';

type ChatSdkReconcilePlanInput = Parameters<typeof printChatSdkReconcilePlan>[0];

export async function promptChatSdkReconcilePlanInConsole(opts: ChatSdkReconcilePlanInput): Promise<void> {
  printChatSdkReconcilePlan(opts);
  console.log(chalk.cyan('Press Enter to continue'));

  await waitForLine();
}

export async function promptChatSdkTunnelInConsole(opts: {
  projectDir: string;
  devCommand: string;
}): Promise<ChatSdkTunnelOfferResult> {
  console.log('');
  console.log(chalk.bold('Start the dev tunnel?'));
  console.log(chalk.dim('Runs your app and registers a public bridge URL with Novu.'));
  console.log(chalk.cyan(`  ${opts.devCommand}`));
  console.log(chalk.cyan('Enter · start tunnel · s · skip'));

  const answer = await waitForLine();

  if (answer.trim().toLowerCase() === 's') {
    return 'skip';
  }

  return 'accept';
}

async function waitForLine(): Promise<string> {
  const rl = readline.createInterface({ input, output });

  try {
    return await rl.question('');
  } finally {
    rl.close();
  }
}
