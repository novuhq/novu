import { Clerk } from '@clerk/clerk-js';
import type { ClerkProp } from '@clerk/clerk-react';
import { normalizeEmail } from '@novu/shared';
import { api } from '../../../api/api.client';

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

    if (isSignIn) {
      const email = getEmailFromQuery(body as string);
      if (email && email !== normalizeEmail(email)) {
        await normalizeEmailData(email);
      }
    }

    return requestInit;
  });

  return clerk as ClerkProp;
}

function getEmailFromQuery(query: string): string | null {
  const params = new URLSearchParams(query);
  const identifier = params.get('identifier');

  return identifier ? decodeURIComponent(identifier) : null;
}

function normalizeEmailData(email: string) {
  return api.post('/v1/clerk/user/normalize', { emailAddress: email });
}
