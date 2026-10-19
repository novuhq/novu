import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import spawn from 'cross-spawn';
import { ConnectUserCancelledError } from '../../errors';
import { restoreStdinForConsole } from '../../restore-stdin-for-console';

export function commandExists(command: string): boolean {
  try {
    execSync(`command -v ${command}`, { stdio: 'ignore' });

    return true;
  } catch {
    return false;
  }
}

/**
 * Run a vendor OAuth CLI (`codex`, `claude`, or an `npx` fallback) with the
 * terminal fully handed over via `stdio: 'inherit'`. The child owns stdin,
 * stdout, and Ctrl+C/Ctrl+D directly — piping stdout would break both the
 * pasted-code prompt and signal handling, leaving the user stuck on the
 * "waiting for browser authentication" screen with no way out.
 *
 * The parent still installs a SIGINT/SIGTERM handler so a first Ctrl+C asks
 * the child to quit gracefully and a second one force-kills it — vendor CLIs
 * sometimes trap SIGINT during the browser wait, so this guarantees an escape.
 */
export async function runInteractiveCli(command: string, args: string[]): Promise<void> {
  // The Ink stdin stream must stay paused so it doesn't steal bytes (the
  // pasted OAuth code) from the inherited child sharing the same TTY fd.
  restoreStdinForConsole();

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    let settled = false;
    let interruptCount = 0;

    const settle = (fn: () => void) => {
      if (settled) {
        return;
      }

      settled = true;
      process.off('SIGINT', onSigint);
      process.off('SIGTERM', onSigterm);
      fn();
    };

    const onSigint = () => {
      interruptCount += 1;
      // First Ctrl+C: ask the CLI to quit. Second: force-kill in case it
      // trapped SIGINT and kept waiting on the OAuth callback.
      child.kill(interruptCount >= 2 ? 'SIGKILL' : 'SIGINT');
    };

    const onSigterm = () => {
      child.kill('SIGTERM');
    };

    process.on('SIGINT', onSigint);
    process.on('SIGTERM', onSigterm);

    child.on('error', (error) => settle(() => reject(error)));
    child.on('close', (code, signal) => {
      if (code === 0) {
        settle(() => resolve());

        return;
      }

      if (code === 130 || signal === 'SIGINT' || signal === 'SIGTERM' || signal === 'SIGKILL') {
        settle(() => reject(new ConnectUserCancelledError()));

        return;
      }

      settle(() => reject(new Error(`Command failed: ${command} ${args.join(' ')} (exit ${code ?? 'unknown'})`)));
    });
  });
}

export function resolveCodexHome(): string {
  return process.env.CODEX_HOME?.trim() || path.join(os.homedir(), '.codex');
}

export function resolveClaudeCredentialsPath(): string {
  return path.join(os.homedir(), '.claude', '.credentials.json');
}

export function resolveLangchainCodexOauthAuthPath(): string {
  return path.join(os.homedir(), '.langchainjs-codex-oauth', 'auth', 'openai.json');
}

function readJsonFile(filePath: string): Record<string, unknown> | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function hasCodexCliAuth(): boolean {
  if (commandExists('codex')) {
    try {
      const output = execSync('codex login status', {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      if (/logged in/i.test(output) || /authenticated:\s*yes/i.test(output)) {
        return true;
      }
    } catch {
      // Fall through to auth.json check.
    }
  }

  const auth = readJsonFile(path.join(resolveCodexHome(), 'auth.json'));
  if (!auth) {
    return false;
  }

  const tokens = auth.tokens;
  if (!tokens || typeof tokens !== 'object') {
    return false;
  }

  const tokenRecord = tokens as Record<string, unknown>;

  return Boolean(tokenRecord.access_token || tokenRecord.refresh_token);
}

export function hasClaudeCodeAuth(): boolean {
  if (commandExists('claude')) {
    try {
      const output = execSync('claude auth status', {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      if (/loggedIn":\s*true/.test(output) || /"loggedIn": true/.test(output)) {
        return true;
      }
    } catch {
      // Fall through to credentials file check.
    }
  }

  const credentials = readJsonFile(resolveClaudeCredentialsPath());
  if (!credentials) {
    return false;
  }

  return Object.keys(credentials).length > 0;
}

export function hasLangchainCodexOauthAuth(): boolean {
  const auth = readJsonFile(resolveLangchainCodexOauthAuthPath());
  if (!auth) {
    return false;
  }

  return Object.keys(auth).length > 0;
}

export function warnSubscriptionEnvConflicts(kind: 'codex-subscription' | 'claude-subscription'): void {
  if (kind === 'codex-subscription' && process.env.OPENAI_API_KEY?.trim()) {
    console.warn(
      'Warning: OPENAI_API_KEY is set. Codex may bill your API account instead of using your ChatGPT subscription.'
    );
  }

  if (kind === 'claude-subscription' && process.env.ANTHROPIC_API_KEY?.trim()) {
    console.warn(
      'Warning: ANTHROPIC_API_KEY is set. Claude Code may bill your API account instead of using your subscription.'
    );
  }
}
