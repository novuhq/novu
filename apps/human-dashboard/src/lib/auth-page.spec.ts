import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prepareAuthForm } from './auth-page';

const { auth, currentUser, headers, redirect } = vi.hoisted(() => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
  headers: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT ${path}`);
  }),
}));

vi.mock('@clerk/nextjs/server', () => ({ auth, currentUser }));
vi.mock('next/headers', () => ({ headers }));
vi.mock('next/navigation', () => ({ redirect }));

describe('prepareAuthForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headers.mockResolvedValue(new Headers({ host: 'www.agentinbox.md' }));
    auth.mockResolvedValue({ userId: null });
    currentUser.mockResolvedValue(null);
  });

  function signedIn() {
    auth.mockResolvedValue({ userId: 'user_1' });
    currentUser.mockResolvedValue({ id: 'user_1' });
  }

  it('hands a signed-out visitor the page to return to', async () => {
    await expect(prepareAuthForm({ redirect_url: '/claim?token=abc' })).resolves.toBe('/claim?token=abc');
  });

  it('sends a signed-in visitor to the holding screen, not past it', async () => {
    signedIn();

    await expect(prepareAuthForm({})).rejects.toThrow('NEXT_REDIRECT /sign-in/finish');
    expect(redirect).toHaveBeenCalledWith('/sign-in/finish');
  });

  it('keeps the page to return to on the way there', async () => {
    signedIn();

    await expect(prepareAuthForm({ redirect_url: '/claim?token=abc' })).rejects.toThrow(
      `NEXT_REDIRECT /sign-in/finish?redirect_url=${encodeURIComponent('/claim?token=abc')}`
    );
  });

  it('leaves a session that outlived its deleted user on the form', async () => {
    auth.mockResolvedValue({ userId: 'user_1' });
    currentUser.mockRejectedValue(Object.assign(new Error('Not Found'), { status: 404 }));

    await expect(prepareAuthForm({})).resolves.toBe('/inbox');
    expect(redirect).not.toHaveBeenCalled();
  });
});
