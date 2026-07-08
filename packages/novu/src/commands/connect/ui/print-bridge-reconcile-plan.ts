import chalk from 'chalk';
import type { BridgeRequirement } from '../types';
import { type BridgeReconcileVariant, reconcilePlanTitle, requirementsFileEnvName } from './bridge-reconcile-variant';

type PrintBridgeReconcilePlanInput = {
  projectDir: string;
  requirements: BridgeRequirement[];
  envPaths: string[];
  wiringInstructions?: string;
  requirementsFile?: string;
  variant?: BridgeReconcileVariant;
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
  const variant = opts.variant ?? 'chat-sdk';

  console.log('');
  console.log(chalk.bold(reconcilePlanTitle(variant)));
  console.log(chalk.dim(opts.projectDir));
  for (const req of opts.requirements) {
    console.log(`  ${requirementMarker(req)} ${req.id}: ${req.detail}`);
  }
  for (const envPath of opts.envPaths) {
    console.log(chalk.gray(`  Env: ${envPath}`));
  }
  if (opts.requirementsFile) {
    console.log(`${requirementsFileEnvName(variant)}=${opts.requirementsFile}`);
  }
  if (opts.wiringInstructions) {
    console.log('');
    console.log(chalk.bold('Code wiring (manual):'));
    console.log(chalk.cyan(opts.wiringInstructions));
  }
}
