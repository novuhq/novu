// The bake's Clerk user and org, and the move of the org to the ID every box shares.

import { log } from '../node/main.ts';
import { ApiOrganization, StripeCustomers, WithId } from '../shared/contracts.ts';
import { api, stripe } from './api.ts';
import { clerk, findSeedUser, SEED, seedPassword, seedUserToken } from './clerk.ts';
import { checkoutMongoose, redis } from './migrate.ts';
import { API_HEALTH, REDIS_PORTS, WORKER_HEALTH } from './paths.ts';
import { step, vars, waitForHttp } from './runtime.ts';
import { pc, stopRunning } from './supervisor.ts';

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

// The API creates the Novu user and org from the Clerk ones on their first request, as in production.
// The user keeps the Novu ID Clerk holds for it. The org gets a random one, and the Clerk org every box shares
// would then link to this box only, so the seed moves it to SEED.novuOrgId, which is the same in every box.
// The password is set on every bake, so BOX_SEED_PASSWORD is the one place it changes.
export async function seedClerk(): Promise<string> {
  const found = await findSeedUser();
  const password = seedPassword();
  const user = found.user
    ? await clerk(`/users/${found.user.id}`, WithId, {
        method: 'PATCH',
        json: { password, skip_password_checks: true },
      })
    : await clerk('/users', WithId, {
        method: 'POST',
        json: {
          email_address: [SEED.email],
          password,
          first_name: SEED.firstName,
          last_name: SEED.lastName,
          skip_password_checks: true,
          skip_legal_checks: true,
        },
      });
  const org =
    found.org ??
    (await clerk('/organizations', WithId, { method: 'POST', json: { name: SEED.orgName, created_by: user.id } }));
  const linkOrg = (externalOrgId: string | null) =>
    clerk(`/organizations/${org.id}/metadata`, WithId, {
      method: 'PATCH',
      json: { public_metadata: { externalOrgId } },
    });
  const me = async () => {
    const token = await seedUserToken(user.id, org.id);
    const { data } = await api('/v1/organizations/me', ApiOrganization, { headers: bearer(token) });

    return { token, org: data };
  };
  // The API trusts a link in the token without looking the org up, so it only creates the org without one.
  // Meanwhile other boxes find theirs by the Clerk org ID.
  await linkOrg(null);
  const created = await me();
  await step('move the seed org to its fixed ID', () => moveSeedOrg(created.org._id));
  await linkOrg(SEED.novuOrgId);
  const seeded = await me();
  if (seeded.org._id !== SEED.novuOrgId) throw new Error(`the seed org is ${seeded.org._id}, not ${SEED.novuOrgId}`);
  log(`seeded ${SEED.email} in ${seeded.org.name} (${seeded.org._id})`);

  return seeded.token;
}

// The bake's Mongo holds only what creating the org wrote, and every reference to the org in it is its ObjectId
// or that ID as a string: both are the quoted ID in canonical Extended JSON. The org's Stripe customer is found by
// its metadata, so it moves too, or the box reuses the one an earlier bake moved. Redis may cache the old ID, and
// the API and worker have nothing else in it yet.
async function moveSeedOrg(oldId: string): Promise<void> {
  await stopRunning(['api', 'worker']);
  const { mongo } = checkoutMongoose().mongoose;
  const { EJSON } = mongo.BSON;
  const to = new mongo.ObjectId(SEED.novuOrgId);
  const client = await mongo.MongoClient.connect(vars.MONGO_URL);
  try {
    const db = client.db();
    let moved = 0;
    for (const { name } of await db.listCollections({ type: 'collection' }, { nameOnly: true }).toArray()) {
      const collection = db.collection(name);
      for (const doc of await collection.find().toArray()) {
        const text = EJSON.stringify(doc, { relaxed: false });
        if (!text.includes(`"${oldId}"`)) continue;
        const next = EJSON.parse(text.replaceAll(`"${oldId}"`, `"${SEED.novuOrgId}"`), { relaxed: false });
        if (String(doc._id) === oldId) {
          await collection.deleteOne({ _id: doc._id });
          await collection.insertOne(next);
        } else await collection.replaceOne({ _id: doc._id }, next);
        moved++;
      }
    }
    const organizations = db.collection('organizations');
    const query = encodeURIComponent(`metadata['organizationId']:'${SEED.novuOrgId}'`);
    const [previous] = (await stripe(`/customers/search?query=${query}`, StripeCustomers)).data;
    const stripeCustomerId = (await organizations.findOne({ _id: to }))?.stripeCustomerId;
    if (previous) await organizations.updateOne({ _id: to }, { $set: { stripeCustomerId: previous.id } });
    else if (typeof stripeCustomerId === 'string')
      await stripe(`/customers/${stripeCustomerId}`, WithId, { 'metadata[organizationId]': SEED.novuOrgId });
    const customer = previous ? `${previous.id} (from an earlier bake)` : String(stripeCustomerId ?? 'none yet');
    log(`moved ${moved} documents from ${oldId} to ${SEED.novuOrgId}; Stripe customer ${customer}`);
  } finally {
    await client.close();
  }
  for (const port of REDIS_PORTS) await redis(port, ['flushall']);
  for (const name of ['api', 'worker']) await pc(['process', 'start', name]);
  await waitForHttp(API_HEALTH, 300);
  await waitForHttp(WORKER_HEALTH, 300);
}
