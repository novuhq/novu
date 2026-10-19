import { log } from '../node/main.ts';
import { ApiOrganization, StripeCustomers, WithId } from '../shared/contracts.ts';
import { api, stripe } from './api.ts';
import { clerk, findSeedUser, SEED, seedPassword, userToken } from './clerk.ts';
import { checkoutMongoose, redis } from './migrate.ts';
import { API_HEALTH, REDIS_PORTS, WORKER_HEALTH } from './paths.ts';
import { step, vars, waitForHttp } from './runtime.ts';
import { pc, stopRunning } from './supervisor.ts';

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

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
    const token = await userToken(user.id, org.id);
    const { data } = await api('/v1/organizations/me', ApiOrganization, { headers: bearer(token) });

    return { token, org: data };
  };
  await linkOrg(null);
  const created = await me();
  await step('move the seed org to its fixed ID', () => moveSeedOrg(created.org._id));
  await linkOrg(SEED.novuOrgId);
  const seeded = await me();
  if (seeded.org._id !== SEED.novuOrgId) throw new Error(`the seed org is ${seeded.org._id}, not ${SEED.novuOrgId}`);
  log(`seeded ${SEED.email} in ${seeded.org.name} (${seeded.org._id})`);

  return seeded.token;
}

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
