import { afterEach, describe, expect, it, vi } from 'vitest';
import { promptBridgeReconcilePlanInConsole, promptBridgeTunnelInConsole } from './console-bridge-reconcile-prompts';

const readlineMocks = vi.hoisted(() => ({
  question: vi.fn<() => Promise<string>>(),
  close: vi.fn(),
}));

vi.mock('node:readline/promises', () => ({
  createInterface: () => ({
    question: readlineMocks.question,
    close: readlineMocks.close,
  }),
}));

describe('console-bridge-reconcile-prompts', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('promptBridgeReconcilePlanInConsole resolves after Enter', async () => {
    readlineMocks.question.mockResolvedValue('');
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await promptBridgeReconcilePlanInConsole({
      projectDir: '/tmp/chat-sdk',
      requirements: [{ id: 'env', status: 'ok', detail: 'NOVU_SECRET_KEY set' }],
      envPaths: ['/tmp/chat-sdk/.env.local'],
    });

    expect(readlineMocks.question).toHaveBeenCalledWith('');
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Press Enter to continue'));
  });

  it('promptBridgeTunnelInConsole accepts on Enter', async () => {
    readlineMocks.question.mockResolvedValue('');

    await expect(
      promptBridgeTunnelInConsole({
        projectDir: '/tmp/chat-sdk',
        devCommand: 'npm run dev:novu',
      })
    ).resolves.toBe('accept');
  });

  it('promptBridgeTunnelInConsole skips when s is entered', async () => {
    readlineMocks.question.mockResolvedValue('s');

    await expect(
      promptBridgeTunnelInConsole({
        projectDir: '/tmp/chat-sdk',
        devCommand: 'npm run dev:novu',
      })
    ).resolves.toBe('skip');
  });
});
