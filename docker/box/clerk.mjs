// The seeded user and org live in the `novu-box` Clerk app that every box shares. The seed and the smoke test
// get session tokens through the Clerk Backend API, which only a development instance allows.

export const SEED = {
  email: 'agent@novu.co',
  password: 'Agent123!@#',
  firstName: 'Agent',
  lastName: 'User',
  orgName: 'Agent Organization',
};

export async function clerk(path, { method = 'GET', body } = {}) {
  if (!process.env.CLERK_SECRET_KEY) throw new Error('CLERK_SECRET_KEY is not set; pass --env-file docker/box/.env');
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`, 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Clerk ${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);

  return text ? JSON.parse(text) : null;
}

export async function findSeedUser() {
  const [user] = await clerk(`/users?email_address=${encodeURIComponent(SEED.email)}`);
  if (!user) return {};
  const { data } = await clerk(`/users/${user.id}/organization_memberships`);

  return { user, org: data.find((membership) => membership.organization.name === SEED.orgName)?.organization };
}

// A token for the seeded user with the seeded org active, like the dashboard sends after sign-in.
export async function seedUserToken({ userId, orgId }) {
  const session = await clerk('/sessions', { method: 'POST', body: { user_id: userId, active_organization_id: orgId } });
  const { jwt } = await clerk(`/sessions/${session.id}/tokens`, { method: 'POST', body: { expires_in_seconds: 600 } });

  return jwt;
}
