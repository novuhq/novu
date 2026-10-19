import * as z from 'zod';
import { type ClerkUser, ClerkUserList, decode, WithId } from '../shared/contracts.ts';
import { boxOfTestUser, testUserEmail } from '../shared/names.ts';
import type { HostEnv } from './env.ts';

export interface TestUser {
  readonly id: string;
  readonly email: string;
  readonly box: string;
  readonly createdAt: number;
}

async function clerk<T>(env: HostEnv, path: string, schema: z.ZodType<T>, init: RequestInit = {}): Promise<T> {
  if (!env.CLERK_SECRET_KEY) throw new Error('the host has no CLERK_SECRET_KEY');
  const what = `Clerk ${init.method ?? 'GET'} ${path.split('?')[0]}`;
  const response = await fetch(`https://api.clerk.com/v1${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${env.CLERK_SECRET_KEY}`, 'Content-Type': 'application/json' },
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`${what} -> ${response.status}: ${body.slice(0, 300)}`);

  return decode(schema, body, what);
}

// Only a user whose one email address is a test user's counts, so nothing else is ever deleted.
function testUserOf(user: ClerkUser): TestUser | null {
  const [address, ...more] = user.email_addresses;
  const box = address && !more.length ? boxOfTestUser(address.email_address) : null;

  return address && box ? { id: user.id, email: address.email_address, box, createdAt: user.created_at } : null;
}

export async function testUsers(env: HostEnv): Promise<Array<TestUser>> {
  const users = await clerk(env, '/users?email_address_query=agent%2B&limit=500', ClerkUserList);

  return users.flatMap((user) => testUserOf(user) ?? []).sort((a, b) => a.createdAt - b.createdAt);
}

// The alphabet must have at most 64 characters: each byte is masked to 6 bits and rejected past its end.
function random(alphabet: string, length: number): string {
  let out = '';
  while (out.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(length))) {
      const index = byte & 63;
      if (index < alphabet.length && out.length < length) out += alphabet[index];
    }
  }

  return out;
}

export async function createTestUser(env: HostEnv, box: string): Promise<{ email: string; password: string }> {
  const email = testUserEmail(box, random('abcdefghijklmnopqrstuvwxyz0123456789', 6));
  const password = random('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 32);
  await clerk(env, '/users', WithId, {
    method: 'POST',
    body: JSON.stringify({
      email_address: [email],
      password,
      first_name: 'Agent',
      last_name: box,
      skip_password_checks: true,
      skip_legal_checks: true,
    }),
  });

  return { email, password };
}

export async function deleteTestUser(env: HostEnv, user: TestUser): Promise<void> {
  await clerk(env, `/users/${user.id}`, z.unknown(), { method: 'DELETE' });
}

export async function deleteBoxUsers(env: HostEnv, box: string): Promise<Array<string>> {
  const users = (await testUsers(env)).filter((user) => user.box === box);
  for (const user of users) await deleteTestUser(env, user);

  return users.map((user) => user.email);
}

// The users to delete before a create, when there are `limit` or more: every user of a box that's gone, then the
// oldest, until under `limit`.
export function toPrune(users: ReadonlyArray<TestUser>, live: ReadonlyArray<string>, limit: number): Array<TestUser> {
  const excess = users.length - limit + 1;
  if (excess <= 0) return [];
  const dead = users.filter((user) => !live.includes(user.box));
  const oldest = users.filter((user) => live.includes(user.box)).slice(0, Math.max(0, excess - dead.length));

  return [...dead, ...oldest];
}
