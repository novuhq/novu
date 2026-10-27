// gets session tokens through the Clerk Backend API, which only a development instance allows.

import type * as z from 'zod';
import { fetchJson, type JsonInit } from '../node/http.ts';
import { ClerkMemberships, ClerkToken, ClerkUsers, WithId } from '../shared/contracts.ts';
import { boxOfTestUser, SEED_EMAIL } from '../shared/names.ts';

export const SEED = {
  email: SEED_EMAIL,
  firstName: 'Agent',
  lastName: 'User',
  orgName: 'Agent Organization',
  novuOrgId: '5eedb0c5eedb0c5eedb0c5ee',
};

function secret(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set; set it as a novu-box-hub secret in Cloudflare`);

  return value;
}

export function clerk<T>(path: string, schema: z.ZodType<T>, init: JsonInit = {}): Promise<T> {
  return fetchJson(`https://api.clerk.com/v1${path}`, schema, {
    ...init,
    headers: { Authorization: `Bearer ${secret('CLERK_SECRET_KEY')}` },
  });
}

export function seedPassword(): string {
  return secret('BOX_SEED_PASSWORD');
}

export async function findSeedUser(): Promise<{ user?: WithId | undefined; org?: WithId | undefined }> {
  const [user] = await clerk(`/users?email_address=${encodeURIComponent(SEED.email)}`, ClerkUsers);
  if (!user) return {};
  const { data } = await clerk(`/users/${user.id}/organization_memberships`, ClerkMemberships);

  return { user, org: data.find((membership) => membership.organization.name === SEED.orgName)?.organization };
}

export async function testUserOrg(email: string): Promise<{ user: WithId; org: WithId }> {
  if (!boxOfTestUser(email)) throw new Error(`not a test user: ${email} (agent+<box>.<id>@novu.co)`);
  const [user] = await clerk(`/users?email_address=${encodeURIComponent(email)}`, ClerkUsers);
  if (!user) throw new Error(`no Clerk user ${email}`);
  const { data } = await clerk(`/users/${user.id}/organization_memberships`, ClerkMemberships);
  const [membership, ...more] = data;
  if (!membership) throw new Error(`${email} has no org yet: sign in with it and finish the onboarding first`);
  if (more.length) throw new Error(`${email} is in ${data.length} orgs; expected only its own`);

  return { user, org: membership.organization };
}

export async function userToken(userId: string, orgId: string): Promise<string> {
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
