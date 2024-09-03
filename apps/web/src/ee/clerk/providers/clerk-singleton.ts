import { Clerk } from '@clerk/clerk-js';
import type { ClerkProp } from '@clerk/clerk-react';
import { normalizeEmail } from '@novu/shared';
import { api } from '../../../api/api.client';

// eslint-disable-next-line import/no-mutable-exports
export let clerk: Clerk;

type BuildClerkOptions = {
  publishableKey: string;
};

export async function buildClerk({ publishableKey }: BuildClerkOptions): Promise<ClerkProp> {
  if (clerk) {
    return clerk as ClerkProp;
  }

  clerk = new Clerk(publishableKey);

  clerk.__unstable__onBeforeRequest(async (requestInit) => {
    const { path, method, body } = requestInit;
    const isSignIn = path === '/client/sign_ins' && method === 'POST';
    const isPasswordStrategy =
      getParamFromQuery(body as string, 'strategy') === 'password' || !getParamFromQuery(body as string, 'strategy');

    if (isSignIn && isPasswordStrategy) {
      const email = getParamFromQuery(body as string, 'identifier');
      if (email && email !== normalizeEmail(email)) {
        await normalizeEmailData(email);
      }
    }

    return requestInit;
  });

  return clerk as ClerkProp;
}

function getParamFromQuery(query: string, param: string): string | null {
  const params = new URLSearchParams(query);
  const value = params.get(param);

  return value ? decodeURIComponent(value) : null;
}

function normalizeEmailData(email: string) {
  return api.post('/v1/clerk/user/normalize', { emailAddress: email });
}
