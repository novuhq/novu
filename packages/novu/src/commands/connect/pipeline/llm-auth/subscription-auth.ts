import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import spawn from 'cross-spawn';

type RunInteractiveCliOptions = {
  onAuthUrl?: () => void;
};

export function commandExists(command: string): boolean {
  try {
    execSync(`command -v ${command}`, { stdio: 'ignore' });

    return true;
  } catch {
    return false;
  }
}

export async function runInteractiveCli(
  command: string,
  args: string[],
  options: RunInteractiveCliOptions = {}
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['inherit', 'pipe', 'pipe'] });
    let authUrlReported = false;
    let outputTail = '';

    const forwardOutput = (chunk: Buffer, target: NodeJS.WriteStream) => {
      target.write(chunk);
      outputTail = `${outputTail}${chunk.toString('utf8')}`.slice(-4096);

      if (!authUrlReported && /https?:\/\/\S+/.test(outputTail)) {
        authUrlReported = true;
        options.onAuthUrl?.();
      }
    };

    child.stdout?.on('data', (chunk: Buffer) => forwardOutput(chunk, process.stdout));
    child.stderr?.on('data', (chunk: Buffer) => forwardOutput(chunk, process.stderr));

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();

        return;
      }

      reject(new Error(`Command failed: ${command} ${args.join(' ')} (exit ${code ?? 'unknown'})`));
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
