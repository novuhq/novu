import chalk from 'chalk';
import { CHAT_SDK_REQUIREMENTS_FILE_ENV } from '../pipeline/chat-sdk/requirements';
import type { BridgeRequirement } from '../types';

type PrintBridgeReconcilePlanInput = {
  projectDir: string;
  requirements: BridgeRequirement[];
  envPaths: string[];
  wiringInstructions?: string;
  requirementsFile?: string;
};

function requirementMarker(req: BridgeRequirement): string {
  if (req.status === 'ok') {
    return chalk.green('✓');
  }

  if (req.status === 'manual') {
    return chalk.yellow('☐');
  }

  return chalk.cyan('…');
}

export function printBridgeReconcilePlan(opts: PrintBridgeReconcilePlanInput): void {
  console.log('');
  console.log(chalk.bold('Chat SDK project setup'));
  console.log(chalk.dim(opts.projectDir));
  for (const req of opts.requirements) {
    console.log(`  ${requirementMarker(req)} ${req.id}: ${req.detail}`);
  }
  for (const envPath of opts.envPaths) {
    console.log(chalk.gray(`  Env: ${envPath}`));
  }
  if (opts.requirementsFile) {
    console.log(`${CHAT_SDK_REQUIREMENTS_FILE_ENV}=${opts.requirementsFile}`);
  }
  if (opts.wiringInstructions) {
    console.log('');
    console.log(chalk.bold('Code wiring (manual):'));
    console.log(chalk.cyan(opts.wiringInstructions));
  }
}
