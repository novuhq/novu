// The seeded user and org live in the `novu-box` Clerk app that every box shares. The seed
// gets session tokens through the Clerk Backend API, which only a development instance allows.

import { Config, Effect, Redacted } from 'effect';
import { BoxError, RequestFailed } from './errors.ts';
import { type Json, request } from './http.ts';

export const SEED = {
  email: 'agent@novu.co',
  firstName: 'Agent',
  lastName: 'User',
  orgName: 'Agent Organization',
  // The seed org's Novu ID, the same in every box, so the Clerk org they share links to each of them.
  novuOrgId: '5eedb0c5eedb0c5eedb0c5ee',
};

const secret = (name: string) =>
  Config.Redacted(name).pipe(
    Effect.mapError(() => new BoxError({ message: `${name} is not set; pass --env-file docker/box/.env` }))
  );

export const clerk = Effect.fn('clerk')(function* (
  path: string,
  init: { method?: 'GET' | 'POST' | 'PATCH'; body?: unknown } = {}
) {
  const key = yield* secret('CLERK_SECRET_KEY');
  const method = init.method ?? 'GET';
  const answer = yield* request(`https://api.clerk.com/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${Redacted.value(key)}`, 'Content-Type': 'application/json' },
    ...(init.body !== undefined && { body: init.body }),
  });
  if (!answer.ok)
    return yield* new RequestFailed({
      message: `Clerk ${method} ${path} -> ${answer.status}: ${answer.text.slice(0, 300)}`,
      status: answer.status,
    });

  return (answer.text ? JSON.parse(answer.text) : null) as Json;
});

// Box URLs are public, so the password is a secret: never in the repo, never logged.
export const seedPassword = Effect.map(secret('BOX_SEED_PASSWORD'), Redacted.value);

export const findSeedUser = Effect.gen(function* () {
  const [user] = yield* clerk(`/users?email_address=${encodeURIComponent(SEED.email)}`);
  if (!user) return { user: undefined, org: undefined };
  const { data } = yield* clerk(`/users/${user.id}/organization_memberships`);
  const org: Json = data.find((membership: Json) => membership.organization.name === SEED.orgName)?.organization;

  return { user: user as Json, org };
});

// A token for the seeded user with the seeded org active, like the dashboard sends after sign-in.
export const seedUserToken = Effect.fn('seedUserToken')(function* (userId: string, orgId: string) {
  const session = yield* clerk('/sessions', {
    method: 'POST',
    body: { user_id: userId, active_organization_id: orgId },
  });
  const { jwt } = yield* clerk(`/sessions/${session.id}/tokens`, { method: 'POST', body: { expires_in_seconds: 600 } });

  return jwt as string;
});
