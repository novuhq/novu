// The seeded user and org live in the `novu-box` Clerk app that every box shares. The seed
// gets session tokens through the Clerk Backend API, which only a development instance allows.

import type * as z from 'zod';
import { fetchJson, type JsonInit } from '../node/http.ts';
import { ClerkMemberships, ClerkToken, ClerkUsers, WithId } from '../shared/contracts.ts';

export const SEED = {
  email: 'agent@novu.co',
  firstName: 'Agent',
  lastName: 'User',
  orgName: 'Agent Organization',
  // The seed org's Novu ID, the same in every box, so the Clerk org they share links to each of them.
  novuOrgId: '5eedb0c5eedb0c5eedb0c5ee',
};

function secret(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set; pass --env-file docker/box/.env`);

  return value;
}

export function clerk<T>(path: string, schema: z.ZodType<T>, init: JsonInit = {}): Promise<T> {
  return fetchJson(`https://api.clerk.com/v1${path}`, schema, {
    ...init,
    headers: { Authorization: `Bearer ${secret('CLERK_SECRET_KEY')}` },
  });
}

// Box URLs are public, so the password is a secret: never in the repo, never logged.
export function seedPassword(): string {
  return secret('BOX_SEED_PASSWORD');
}

export async function findSeedUser(): Promise<{ user?: WithId | undefined; org?: WithId | undefined }> {
  const [user] = await clerk(`/users?email_address=${encodeURIComponent(SEED.email)}`, ClerkUsers);
  if (!user) return {};
  const { data } = await clerk(`/users/${user.id}/organization_memberships`, ClerkMemberships);

  return { user, org: data.find((membership) => membership.organization.name === SEED.orgName)?.organization };
}

// A token for the seeded user with the seeded org active, like the dashboard sends after sign-in.
export async function seedUserToken(userId: string, orgId: string): Promise<string> {
  const session = await clerk('/sessions', WithId, {
    method: 'POST',
    json: { user_id: userId, active_organization_id: orgId },
  });
  const { jwt } = await clerk(`/sessions/${session.id}/tokens`, ClerkToken, {
    method: 'POST',
    json: { expires_in_seconds: 600 },
  });

  return jwt;
}
