import { type ChildProcess, execSync, spawn } from 'node:child_process';
import chalk from 'chalk';

import { buildDevNovuScript } from './dev-script';

export type RunChatSdkBridgeInput = {
  projectDir: string;
};

function killProcessTree(child: ChildProcess): void {
  if (!child.pid) {
    return;
  }

  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
    } else {
      process.kill(-child.pid, 'SIGTERM');
    }
  } catch {
    child.kill('SIGTERM');
  }
}

export async function runChatSdkBridge(input: RunChatSdkBridgeInput): Promise<void> {
  const devCommand = buildDevNovuScript(input.projectDir);
  let child: ChildProcess | null = null;
  let exiting = false;

  const shutdown = (exitCode = 0) => {
    if (exiting) {
      return;
    }

    exiting = true;

    if (child && !child.killed) {
      killProcessTree(child);
    }

    process.exit(exitCode);
  };

  process.once('SIGINT', () => shutdown(0));
  process.once('SIGTERM', () => shutdown(0));

  console.log(chalk.cyan('\nStarting your Chat SDK app and dev tunnel…'));
  console.log(chalk.green(`  ▶ ${devCommand}`));
  console.log(chalk.dim('\n  Send a message on your connected channel to test the bot.'));
  console.log(chalk.dim('  Press Ctrl+C to stop.\n'));

  const isWindows = process.platform === 'win32';
  const shell = isWindows ? 'cmd' : 'sh';
  const shellFlag = isWindows ? '/c' : '-c';

  child = spawn(shell, [shellFlag, devCommand], {
    cwd: input.projectDir,
    stdio: 'inherit',
    detached: false,
  });

  child.on('error', (err) => {
    console.error(chalk.red(`\n  ✗ Failed to start dev tunnel: ${err.message}`));
    shutdown(1);
  });

  child.on('exit', (code, signal) => {
    if (exiting) {
      return;
    }

    if (signal === 'SIGINT' || signal === 'SIGTERM') {
      shutdown(0);

      return;
    }

    shutdown(code ?? 1);
  });

  await new Promise<void>(() => undefined);
}
