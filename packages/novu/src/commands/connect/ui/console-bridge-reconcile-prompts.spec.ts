import { afterEach, describe, expect, it, vi } from 'vitest';
import { promptBridgeReconcilePlanInConsole, promptBridgeTunnelInConsole } from './console-bridge-reconcile-prompts';

const waitForConsoleLine = vi.hoisted(() => vi.fn<() => Promise<string>>());

vi.mock('./wait-for-console-line', () => ({
  waitForConsoleLine,
}));

describe('console-bridge-reconcile-prompts', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('promptBridgeReconcilePlanInConsole resolves after Enter', async () => {
    waitForConsoleLine.mockResolvedValue('');
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await promptBridgeReconcilePlanInConsole({
      projectDir: '/tmp/chat-sdk',
      requirements: [{ id: 'env', status: 'ok', detail: 'NOVU_SECRET_KEY set' }],
      envPaths: ['/tmp/chat-sdk/.env.local'],
      variant: 'chat-sdk',
    });

    expect(waitForConsoleLine).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Press Enter to continue'));
  });

  it('promptBridgeReconcilePlanInConsole uses AI SDK title', async () => {
    waitForConsoleLine.mockResolvedValue('');
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await promptBridgeReconcilePlanInConsole({
      projectDir: '/tmp/ai-sdk',
      requirements: [{ id: 'package', status: 'ok', detail: '@novu/framework installed' }],
      envPaths: [],
      variant: 'ai-sdk',
    });

    expect(log).toHaveBeenCalledWith(expect.stringContaining('AI SDK project setup'));
  });

  it('promptBridgeTunnelInConsole accepts on Enter', async () => {
    waitForConsoleLine.mockResolvedValue('');

    await expect(
      promptBridgeTunnelInConsole({
        projectDir: '/tmp/chat-sdk',
        devCommand: 'npm run dev:novu',
      })
    ).resolves.toBe('accept');
  });

  it('promptBridgeTunnelInConsole skips when s is entered', async () => {
    waitForConsoleLine.mockResolvedValue('s');

    await expect(
      promptBridgeTunnelInConsole({
        projectDir: '/tmp/chat-sdk',
        devCommand: 'npm run dev:novu',
      })
    ).resolves.toBe('skip');
  });
});
