import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInboxAction } from './actions';

const { findCurrentUser, requestForAccount } = vi.hoisted(() => ({
  findCurrentUser: vi.fn(),
  requestForAccount: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/lib/auth-page', () => ({ findCurrentUser }));
vi.mock('@/lib/human-account', () => ({ requireHumanAccount: vi.fn().mockResolvedValue({ humanUserId: 'user_1' }) }));
vi.mock('@/lib/human-api-key', () => ({ requestForAccount }));
vi.mock('@/lib/human-onboarding', () => ({ updateOnboardingState: vi.fn() }));

describe('createInboxAction', () => {
  const input = { name: 'Atlas', handle: 'atlas' };

  function signedInWith(primaryEmailAddress: unknown) {
    findCurrentUser.mockResolvedValue({ firstName: 'Ada', lastName: null, primaryEmailAddress });
  }

  /** The body of the `POST /v1/human/setup` the action made. */
  function setupBody() {
    return requestForAccount.mock.calls[0][2].body;
  }

  beforeEach(() => {
    requestForAccount.mockReset().mockResolvedValue({ agentId: 'relay1', subscriberId: 'ada' });
  });

  it('tells the API when Clerk has verified the sign-in address', async () => {
    signedInWith({ emailAddress: 'ada@acme.co', verification: { status: 'verified' } });

    await expect(createInboxAction(input)).resolves.toEqual({ ok: true });

    expect(requestForAccount.mock.calls[0][1]).toBe('/v1/human/setup');
    expect(setupBody()).toMatchObject({ operator: true, email: 'ada@acme.co', emailVerified: true });
  });

  it.each([
    ['is still unverified', { status: 'unverified' }],
    ['has expired', { status: 'expired' }],
    ['is missing', null],
  ])('sends the address alone when its verification %s', async (_what, verification) => {
    signedInWith({ emailAddress: 'ada@acme.co', verification });

    await createInboxAction(input);

    expect(setupBody()).toMatchObject({ email: 'ada@acme.co' });
    expect(setupBody()).not.toHaveProperty('emailVerified');
  });

  it('sends neither without a primary address', async () => {
    signedInWith(null);

    await createInboxAction(input);

    expect(setupBody()).not.toHaveProperty('email');
    expect(setupBody()).not.toHaveProperty('emailVerified');
  });
});
