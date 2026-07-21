import { afterEach, describe, expect, it, vi } from 'vitest';
import { CloudRegionEnum } from '../../../dev/enums';
import type { ConnectUI } from '../../ui/ui';
import { ensureSubscriptionAuth } from './ensure-subscription-auth';
import { resolveLlmAuthChoice } from './resolve-llm-auth';
import * as subscriptionAuth from './subscription-auth';

function baseOptions() {
  return {
    region: CloudRegionEnum.US,
    apiUrl: 'https://api.novu.co',
    dashboardUrl: 'https://dashboard.novu.co',
    connectDashboardUrl: 'https://dashboard.novu.co',
  };
}

function createUi(overrides: Partial<ConnectUI> = {}): ConnectUI {
  return {
    interactive: true,
    releaseTerminal: vi.fn().mockResolvedValue(undefined),
    pickLlmAuthKind: vi.fn().mockResolvedValue('skip'),
    promptForSecretInput: vi.fn().mockResolvedValue('sk-test'),
    ...overrides,
  } as ConnectUI;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('resolveLlmAuthChoice', () => {
  it('resolves skip from CI when llm-auth is omitted', async () => {
    const result = await resolveLlmAuthChoice({
      connectMode: 'ai-sdk',
      options: { ci: true, ...baseOptions() },
      ui: createUi(),
    });

    expect(result).toEqual({ kind: 'skip' });
  });

  it('resolves OpenAI API key from CI flags', async () => {
    const result = await resolveLlmAuthChoice({
      connectMode: 'ai-sdk',
      options: {
        ci: true,
        llmAuth: 'openai',
        openaiApiKey: 'sk-test',
        ...baseOptions(),
      },
      ui: createUi(),
    });

    expect(result).toEqual({ kind: 'openai-api-key', apiKey: 'sk-test' });
  });

  it('rejects Claude subscription for langchain runtime', async () => {
    await expect(
      resolveLlmAuthChoice({
        connectMode: 'langchain',
        options: {
          ci: true,
          llmAuth: 'claude-subscription',
          ...baseOptions(),
        },
        ui: createUi(),
      })
    ).rejects.toThrow(/only supported for --runtime ai-sdk/);
  });

  it('resolves codex subscription from CI when already authenticated', async () => {
    vi.spyOn(subscriptionAuth, 'hasCodexCliAuth').mockReturnValue(true);

    const result = await resolveLlmAuthChoice({
      connectMode: 'ai-sdk',
      options: {
        ci: true,
        llmAuth: 'codex-subscription',
        ...baseOptions(),
      },
      ui: createUi(),
    });

    expect(result).toEqual({ kind: 'codex-subscription' });
  });
});

describe('ensureSubscriptionAuth', () => {
  it('skips login when codex auth already exists', async () => {
    vi.spyOn(subscriptionAuth, 'hasCodexCliAuth').mockReturnValue(true);
    const releaseTerminal = vi.fn();

    await ensureSubscriptionAuth({
      kind: 'codex-subscription',
      connectMode: 'ai-sdk',
      ui: createUi({ releaseTerminal }),
    });

    expect(releaseTerminal).not.toHaveBeenCalled();
  });

  it('prints a browser sign-in hint during LangChain browser OAuth', async () => {
    vi.spyOn(subscriptionAuth, 'hasLangchainCodexOauthAuth').mockReturnValueOnce(false).mockReturnValue(true);
    vi.spyOn(subscriptionAuth, 'runInteractiveCli').mockResolvedValue(undefined);
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await ensureSubscriptionAuth({
      kind: 'codex-subscription',
      connectMode: 'langchain',
      ui: createUi(),
    });

    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('A browser window will open to sign in'));
  });
});
