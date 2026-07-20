import { describe, expect, it } from 'vitest';
import { ConnectUserCancelledError } from '../../errors';
import {
  resolveClaudeCredentialsPath,
  resolveCodexHome,
  resolveLangchainCodexOauthAuthPath,
  runInteractiveCli,
} from './subscription-auth';
import { npxSubscriptionCliArgs, SUBSCRIPTION_CLI_NPX_SPECS } from './subscription-cli-specs';

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
  it('resolves when the child exits cleanly', async () => {
    await expect(runInteractiveCli(process.execPath, ['-e', 'process.exit(0)'])).resolves.toBeUndefined();
  });

  it('treats a SIGINT exit as user cancellation', async () => {
    await expect(
      runInteractiveCli(process.execPath, ['-e', 'process.kill(process.pid, "SIGINT")'])
    ).rejects.toBeInstanceOf(ConnectUserCancelledError);
  });

  it('rejects with a command failure for a non-zero exit', async () => {
    await expect(runInteractiveCli(process.execPath, ['-e', 'process.exit(3)'])).rejects.toThrow(/exit 3/);
  });
});
