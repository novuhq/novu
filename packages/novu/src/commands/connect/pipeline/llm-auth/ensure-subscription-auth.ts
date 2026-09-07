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
import { npxSubscriptionCliArgs, SUBSCRIPTION_CLI_NPX_SPECS } from './subscription-cli-specs';

type EnsureSubscriptionAuthInput = {
  kind: 'codex-subscription' | 'claude-subscription';
  connectMode: BridgeAdapterVariant;
  ui: ConnectUI;
  ci?: boolean;
};

function printBrowserAuthHint(): void {
  console.log(chalk.dim('A browser window will open to sign in. Press Ctrl+C to cancel and return here.'));
}

async function ensureCodexCliAuth(ui: ConnectUI, ci?: boolean): Promise<void> {
  if (hasCodexCliAuth()) {
    console.log(chalk.green('✓ Codex CLI login already on this machine — using your existing session.'));

    return;
  }

  if (ci) {
    throw new Error(
      `ChatGPT subscription requires Codex CLI login. Run \`codex login\` or \`npx ${SUBSCRIPTION_CLI_NPX_SPECS.codex} login\` on this machine, then re-run with --llm-auth codex-subscription.`
    );
  }

  await ui.releaseTerminal();
  console.log('Sign in with your ChatGPT account to use Codex (Plus/Pro subscription).');
  printBrowserAuthHint();

  if (commandExists('codex')) {
    await runInteractiveCli('codex', ['login']);
  } else {
    await runInteractiveCli('npx', npxSubscriptionCliArgs(SUBSCRIPTION_CLI_NPX_SPECS.codex, ['login']));
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
      `ChatGPT subscription for LangChain requires OAuth login. Run \`npx ${SUBSCRIPTION_CLI_NPX_SPECS.langchainCodexOauth} auth login\`, then re-run with --llm-auth codex-subscription.`
    );
  }

  await ui.releaseTerminal();
  console.log('Sign in with your ChatGPT account for LangChain Codex OAuth.');
  printBrowserAuthHint();

  await runInteractiveCli(
    'npx',
    npxSubscriptionCliArgs(SUBSCRIPTION_CLI_NPX_SPECS.langchainCodexOauth, ['auth', 'login'])
  );

  if (!hasLangchainCodexOauthAuth()) {
    throw new Error(
      `LangChain Codex OAuth login did not complete. Run \`npx ${SUBSCRIPTION_CLI_NPX_SPECS.langchainCodexOauth} auth login\` and try again.`
    );
  }

  console.log(chalk.green('✓ ChatGPT subscription connected.'));
}

async function ensureClaudeCodeAuth(ui: ConnectUI, ci?: boolean): Promise<void> {
  if (hasClaudeCodeAuth()) {
    console.log(chalk.green('✓ Claude Code login already on this machine — using your existing session.'));

    return;
  }

  if (ci) {
    throw new Error(
      `Claude subscription requires Claude Code login. Run \`claude auth login\` or \`npx ${SUBSCRIPTION_CLI_NPX_SPECS.claudeCode} auth login\`, then re-run with --llm-auth claude-subscription.`
    );
  }

  await ui.releaseTerminal();
  console.log('Sign in with your Claude Pro or Max subscription via Claude Code.');
  printBrowserAuthHint();

  if (commandExists('claude')) {
    await runInteractiveCli('claude', ['auth', 'login']);
  } else {
    await runInteractiveCli('npx', npxSubscriptionCliArgs(SUBSCRIPTION_CLI_NPX_SPECS.claudeCode, ['auth', 'login']));
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
