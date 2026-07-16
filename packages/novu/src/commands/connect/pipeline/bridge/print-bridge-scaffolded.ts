import chalk from 'chalk';
import { printBridgeDevNextSteps } from './print-bridge-dev-next-steps';
import type { BridgeScaffoldVariant } from './types';

export function printBridgeScaffolded(opts: {
  variant: BridgeScaffoldVariant;
  projectDir: string;
  envPaths?: string[];
  agentFilePath?: string;
  skippedInstall?: boolean;
}): void {
  if (opts.variant === 'chat-sdk') {
    console.log(`${chalk.green('✓')} Scaffolded Chat SDK project at ${opts.projectDir}`);
    for (const envPath of opts.envPaths ?? []) {
      console.log(chalk.gray(`  Wrote ${envPath}`));
    }
  } else if (opts.variant === 'ai-sdk') {
    console.log(`${chalk.green('✓')} Scaffolded AI SDK agent project at ${opts.projectDir}`);
    if (opts.agentFilePath) {
      console.log(chalk.gray(`  Agent handler: ${opts.agentFilePath}`));
    }
  } else if (opts.variant === 'langchain') {
    console.log(`${chalk.green('✓')} Scaffolded LangChain agent project at ${opts.projectDir}`);
    if (opts.agentFilePath) {
      console.log(chalk.gray(`  Agent handler: ${opts.agentFilePath}`));
    }
  } else {
    console.log(`${chalk.green('✓')} Scaffolded agent project at ${opts.projectDir}`);
    if (opts.agentFilePath) {
      console.log(chalk.gray(`  Agent handler: ${opts.agentFilePath}`));
    }
  }

  if (opts.skippedInstall) {
    console.log(chalk.yellow('  ⚠ Inside a monorepo — npm install was skipped.'));
  }

  printBridgeDevNextSteps({
    projectDir: opts.projectDir,
    skippedInstall: opts.skippedInstall,
  });
}
