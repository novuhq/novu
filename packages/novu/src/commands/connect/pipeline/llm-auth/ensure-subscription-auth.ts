import chalk from 'chalk';
import type { ConnectUI } from '../../ui/ui';
import type { BridgeAdapterVariant } from '../bridge-adapter/types';
import {
  commandExists,
  hasClaudeCodeAuth,
  hasCodexCliAuth,
  hasLangchainCodexOauthAuth,
  runInteractiveCli,
  warnSubscriptionEnvConflicts,
} from './subscription-auth';

type EnsureSubscriptionAuthInput = {
  kind: 'codex-subscription' | 'claude-subscription';
  connectMode: BridgeAdapterVariant;
  ui: ConnectUI;
  ci?: boolean;
};

function printBrowserAuthWaitingStatus(): void {
  console.log(chalk.dim('⏳ Waiting for browser authentication… Return here when it completes.'));
}

async function ensureCodexCliAuth(ui: ConnectUI, ci?: boolean): Promise<void> {
  if (hasCodexCliAuth()) {
    return;
  }

  if (ci) {
    throw new Error(
      'ChatGPT subscription requires Codex CLI login. Run `codex login` (or `npx @openai/codex login`) on this machine, then re-run with --llm-auth codex-subscription.'
    );
  }

  await ui.releaseTerminal();
  console.log('Sign in with your ChatGPT account to use Codex (Plus/Pro subscription).');

  if (commandExists('codex')) {
    await runInteractiveCli('codex', ['login'], { onAuthUrl: printBrowserAuthWaitingStatus });
  } else {
    await runInteractiveCli('npx', ['--yes', '@openai/codex', 'login'], {
      onAuthUrl: printBrowserAuthWaitingStatus,
    });
  }

  if (!hasCodexCliAuth()) {
    throw new Error('Codex login did not complete. Run `codex login` and try again.');
  }
}

async function ensureLangchainCodexOauthAuth(ui: ConnectUI, ci?: boolean): Promise<void> {
  if (hasLangchainCodexOauthAuth()) {
    return;
  }

  if (ci) {
    throw new Error(
      'ChatGPT subscription for LangChain requires OAuth login. Run `npx langchainjs-codex-oauth auth login`, then re-run with --llm-auth codex-subscription.'
    );
  }

  await ui.releaseTerminal();
  console.log('Sign in with your ChatGPT account for LangChain Codex OAuth.');

  await runInteractiveCli('npx', ['--yes', 'langchainjs-codex-oauth', 'auth', 'login'], {
    onAuthUrl: printBrowserAuthWaitingStatus,
  });

  if (!hasLangchainCodexOauthAuth()) {
    throw new Error(
      'LangChain Codex OAuth login did not complete. Run `npx langchainjs-codex-oauth auth login` and try again.'
    );
  }

  console.log(chalk.green('✓ ChatGPT subscription connected.'));
}

async function ensureClaudeCodeAuth(ui: ConnectUI, ci?: boolean): Promise<void> {
  if (hasClaudeCodeAuth()) {
    return;
  }

  if (ci) {
    throw new Error(
      'Claude subscription requires Claude Code login. Run `claude auth login` (or `npx @anthropic-ai/claude-code auth login`), then re-run with --llm-auth claude-subscription.'
    );
  }

  await ui.releaseTerminal();
  console.log('Sign in with your Claude Pro or Max subscription via Claude Code.');

  if (commandExists('claude')) {
    await runInteractiveCli('claude', ['auth', 'login'], { onAuthUrl: printBrowserAuthWaitingStatus });
  } else {
    await runInteractiveCli('npx', ['--yes', '@anthropic-ai/claude-code', 'auth', 'login'], {
      onAuthUrl: printBrowserAuthWaitingStatus,
    });
  }

  if (!hasClaudeCodeAuth()) {
    throw new Error('Claude Code login did not complete. Run `claude auth login` and try again.');
  }
}

export async function ensureSubscriptionAuth(input: EnsureSubscriptionAuthInput): Promise<void> {
  warnSubscriptionEnvConflicts(input.kind);

  if (input.kind === 'claude-subscription') {
    await ensureClaudeCodeAuth(input.ui, input.ci);

    return;
  }

  if (input.connectMode === 'langchain') {
    await ensureLangchainCodexOauthAuth(input.ui, input.ci);

    return;
  }

  await ensureCodexCliAuth(input.ui, input.ci);
}
