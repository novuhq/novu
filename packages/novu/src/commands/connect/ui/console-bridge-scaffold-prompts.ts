import chalk from 'chalk';
import type { BridgeScaffoldVariant } from '../pipeline/bridge/types';
import { type BridgeReconcileVariant, installDepsPrompt } from './bridge-reconcile-variant';
import { waitForConsoleLine } from './wait-for-console-line';

function toReconcileVariant(variant: BridgeScaffoldVariant): BridgeReconcileVariant {
  if (variant === 'custom-code') {
    return 'ai-sdk';
  }

  return variant;
}

function scaffoldTitle(variant: BridgeScaffoldVariant): string {
  if (variant === 'custom-code') {
    return 'Scaffold an agent app?';
  }

  if (variant === 'ai-sdk') {
    return 'Scaffold an AI SDK agent app?';
  }

  if (variant === 'langchain') {
    return 'Scaffold a LangChain agent app?';
  }

  return 'Scaffold a Chat SDK app?';
}

function scaffoldSummary(variant: BridgeScaffoldVariant): string {
  if (variant === 'custom-code') {
    return 'This installs @novu/framework, Next.js, and wires your Novu credentials into .env.local.';
  }

  if (variant === 'ai-sdk') {
    return 'This installs @novu/framework, Next.js, and wires your Novu credentials into .env.local. Agent handlers use @novu/framework/ai-sdk.';
  }

  if (variant === 'langchain') {
    return 'This installs @novu/framework, langchain, Next.js, and wires your Novu credentials into .env.local. Agent handlers use @novu/framework/langchain.';
  }

  return 'This installs chat, @novu/chat-sdk-adapter, and wires your Novu credentials into .env.local.';
}

export async function promptConfirmScaffoldInConsole(opts: {
  projectDir: string;
  appName: string;
  variant: BridgeScaffoldVariant;
  llmAuthLabel?: string;
}): Promise<boolean> {
  console.log('');
  console.log(chalk.bold(scaffoldTitle(opts.variant)));
  console.log(chalk.dim(`No project was found here. We'll create one at:`));
  console.log(`  ${chalk.bold(opts.projectDir)}/${chalk.cyan(opts.appName)}`);
  if (opts.llmAuthLabel) {
    console.log(`  ${chalk.bold('LLM wiring:')} ${chalk.cyan(opts.llmAuthLabel)}`);
  }
  console.log(chalk.dim(scaffoldSummary(opts.variant)));
  console.log(chalk.cyan('Enter · scaffold · s · cancel'));

  const answer = await waitForConsoleLine();
  const normalized = answer.trim().toLowerCase();

  if (normalized === 's' || normalized === 'n' || normalized === 'no' || normalized === 'cancel') {
    return false;
  }

  return true;
}

export async function promptConfirmInstallBridgeDepsInConsole(opts: {
  projectDir: string;
  installCommand: string;
  packages: string[];
  variant: BridgeScaffoldVariant;
}): Promise<boolean> {
  console.log('');
  console.log(chalk.bold(installDepsPrompt(toReconcileVariant(opts.variant))));
  console.log(chalk.dim(`We'll add: ${opts.packages.join(', ')}`));
  console.log(chalk.gray(`  Project: ${opts.projectDir}`));
  console.log(chalk.cyan(`  ${opts.installCommand}`));
  console.log(chalk.cyan('Enter · install · s · skip'));

  const answer = await waitForConsoleLine();
  const normalized = answer.trim().toLowerCase();

  if (normalized === 's' || normalized === 'n' || normalized === 'no' || normalized === 'skip') {
    return false;
  }

  return true;
}
