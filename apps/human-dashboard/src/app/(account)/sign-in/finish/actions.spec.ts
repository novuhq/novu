import { beforeEach, describe, expect, it, vi } from 'vitest';

import { homePathAction } from './actions';

const { loadSetupProgress, requireHumanAccount } = vi.hoisted(() => ({
  loadSetupProgress: vi.fn(),
  requireHumanAccount: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({
  unstable_rethrow: (error: unknown) => {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error;
    }
  },
}));
vi.mock('@/lib/human-account', () => ({ requireHumanAccount }));
vi.mock('@/lib/human-onboarding', () => ({ loadSetupProgress }));

describe('homePathAction', () => {
  const agent = { id: 'agent_1' };

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    requireHumanAccount.mockReset().mockResolvedValue({ humanUserId: 'user_1' });
    loadSetupProgress.mockReset();
  });

  it('goes straight to the onboarding from a new account', async () => {
    loadSetupProgress.mockResolvedValue({ agent: null, step: 'address', state: {} });

    await expect(homePathAction()).resolves.toBe('/onboarding');
  });

  it('goes back to the onboarding for an operator who left it halfway', async () => {
    loadSetupProgress.mockResolvedValue({ agent, step: 'connect', state: {} });

    await expect(homePathAction()).resolves.toBe('/onboarding');
  });

  it('opens the inbox for an operator who chose to skip the rest', async () => {
    loadSetupProgress.mockResolvedValue({ agent, step: 'connect', state: { skippedAt: '2026-11-02T10:00:00.000Z' } });

    await expect(homePathAction()).resolves.toBe('/inbox');
  });

  it('opens the inbox for an operator who is done', async () => {
    loadSetupProgress.mockResolvedValue({ agent, step: 'done', state: {} });

    await expect(homePathAction()).resolves.toBe('/inbox');
  });

  it('opens the inbox when the setup can not be read, which copes with that by itself', async () => {
    loadSetupProgress.mockRejectedValue(new Error('The API is down'));

    await expect(homePathAction()).resolves.toBe('/inbox');
  });

  it('lets a redirect to sign-in keep going', async () => {
    requireHumanAccount.mockRejectedValue(new Error('NEXT_REDIRECT'));

    await expect(homePathAction()).rejects.toThrow('NEXT_REDIRECT');
  });
});
