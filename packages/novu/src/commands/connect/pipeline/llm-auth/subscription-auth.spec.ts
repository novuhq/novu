import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  resolveClaudeCredentialsPath,
  resolveCodexHome,
  resolveLangchainCodexOauthAuthPath,
  runInteractiveCli,
} from './subscription-auth';
import { npxSubscriptionCliArgs, SUBSCRIPTION_CLI_NPX_SPECS } from './subscription-cli-specs';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('subscription-cli-specs', () => {
  it('pins npx package versions for OAuth fallbacks', () => {
    expect(npxSubscriptionCliArgs(SUBSCRIPTION_CLI_NPX_SPECS.claudeCode, ['auth', 'login'])).toEqual([
      '--yes',
      '@anthropic-ai/claude-code@2.1.209',
      'auth',
      'login',
    ]);
  });
});

describe('subscription-auth paths', () => {
  it('resolves default credential paths', () => {
    expect(resolveCodexHome()).toContain('.codex');
    expect(resolveClaudeCredentialsPath()).toContain('.claude');
    expect(resolveLangchainCodexOauthAuthPath()).toContain('langchainjs-codex-oauth');
  });
});

describe('runInteractiveCli', () => {
  it('notifies after forwarding an OAuth URL', async () => {
    const events: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      events.push(String(chunk));

      return true;
    });
    const runWithAuthUrlCallback = runInteractiveCli as unknown as (
      command: string,
      args: string[],
      options: { onAuthUrl: () => void }
    ) => Promise<void>;

    await runWithAuthUrlCallback(
      process.execPath,
      ['-e', "console.log('https://auth.openai.com/oauth/authorize?test=1')"],
      { onAuthUrl: () => events.push('WAITING') }
    );

    const output = events.join('');

    expect(output).toContain('https://auth.openai.com/oauth/authorize?test=1');
    expect(output.indexOf('WAITING')).toBeGreaterThan(output.indexOf('https://auth.openai.com'));
  });
});
