import * as z from 'zod';
import { log } from '../node/main.ts';
import { CreatedTestUser, TestUsers } from '../shared/contracts.ts';
import { boxOfTestUser, boxOrigin } from '../shared/names.ts';
import { cloudTarget } from './cloud.ts';
import { hostBoxes, hubToken } from './cloud-http.ts';

export async function createUser(box: string, asJson: boolean): Promise<number> {
  const { email, password, pruned } = await hostBoxes(`users/${box}`, CreatedTestUser, {
    method: 'POST',
    token: hubToken,
  });
  if (pruned.length) log(`deleted older test users first, to stay under Clerk's limit: ${pruned.join(', ')}`);
  const url = boxOrigin(box);
  console.log(
    asJson
      ? JSON.stringify({ box, email, password, url })
      : `email: ${email}\npassword: ${password}\nsign in at: ${url}`
  );

  return 0;
}

export async function listUsers(limit: number): Promise<number> {
  const { users, prune } = await hostBoxes(`users?limit=${limit}`, TestUsers, { token: hubToken });
  for (const user of users) console.log(`${user.email}  ${user.createdAt}${user.live ? '' : '  (its box is gone)'}`);
  console.log(`${users.length} test users; at ${limit} or more, a create deletes first: ${prune.join(', ') || 'none'}`);

  return 0;
}

export async function inUserBox(command: 'team' | 'channels', email: string): Promise<number> {
  const target = cloudTarget({ box: testUserBox(email), token: hubToken });
  await target.ready();

  return target.box([command, email]);
}

export async function deleteUser(email: string): Promise<number> {
  testUserBox(email);
  await hostBoxes(`users/${encodeURIComponent(email)}`, z.unknown(), { method: 'DELETE', token: hubToken });
  log(`deleted ${email}`);

  return 0;
}

function testUserBox(email: string): string {
  const box = boxOfTestUser(email);
  if (!box) throw new Error(`not a test user: ${email} (agent+<box>.<id>@novu.co, from \`box user create\`)`);

  return box;
}
