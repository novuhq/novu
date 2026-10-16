// What a bake seeds through the box's own API (the Clerk user and org, integrations, the Team tier), and the bridge
// app's sync, which start and apply run again.

import { createHmac } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { Effect } from 'effect';
import { clerk, findSeedUser, SEED, seedPassword, seedUserToken } from './clerk.ts';
import { BoxError, RequestFailed } from './errors.ts';
import { api, apiHas, type Json, request, stripe } from './http.ts';
import { redis } from './migrate.ts';
import {
  API_HEALTH,
  BRIDGE_SECRET,
  BRIDGE_URL,
  MAIL_HOST,
  MANAGED_AGENT,
  REDIS_PORTS,
  REPO,
  SINK_URL,
  WORKER_HEALTH,
} from './paths.ts';
import { BoxEnv, log, step, waitForHttp } from './runtime.ts';
import { ProcessCompose } from './supervisor.ts';

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

// The API creates the Novu user and org from the Clerk ones on their first request, as in production.
// The user keeps the Novu ID Clerk holds for it. The org gets a random one, and the Clerk org every box shares
// would then link to this box only, so the seed moves it to SEED.novuOrgId, which is the same in every box.
// The password is set on every bake, so BOX_SEED_PASSWORD is the one place it changes.
export const seedClerk = Effect.gen(function* () {
  let { user, org } = yield* findSeedUser;
  const password = yield* seedPassword;
  if (user) yield* clerk(`/users/${user.id}`, { method: 'PATCH', body: { password, skip_password_checks: true } });
  else
    user = yield* clerk('/users', {
      method: 'POST',
      body: {
        email_address: [SEED.email],
        password,
        first_name: SEED.firstName,
        last_name: SEED.lastName,
        skip_password_checks: true,
        skip_legal_checks: true,
      },
    });
  org ??= yield* clerk('/organizations', { method: 'POST', body: { name: SEED.orgName, created_by: user.id } });
  const linkOrg = (externalOrgId: string | null) =>
    clerk(`/organizations/${org.id}/metadata`, { method: 'PATCH', body: { public_metadata: { externalOrgId } } });
  const me = Effect.gen(function* () {
    const token = yield* seedUserToken(user.id, org.id);
    const body = yield* api('/v1/organizations/me', { headers: bearer(token) });

    return { token, org: body.data };
  });
  // The API trusts a link in the token without looking the org up, so it only creates the org without one.
  // Meanwhile other boxes find theirs by the Clerk org ID.
  yield* linkOrg(null);
  const created = yield* me;
  yield* step('move the seed org to its fixed ID', moveSeedOrg(created.org._id));
  yield* linkOrg(SEED.novuOrgId);
  const seeded = yield* me;
  if (seeded.org._id !== SEED.novuOrgId)
    return yield* new BoxError({ message: `the seed org is ${seeded.org._id}, not ${SEED.novuOrgId}` });
  log(`seeded ${SEED.email} in ${seeded.org.name} (${seeded.org._id})`);

  return seeded.token;
});

const mongo = <A>(what: string, f: () => Promise<A>) =>
  Effect.tryPromise({
    try: f,
    catch: (error) => new BoxError({ message: `${what}: ${(error as Error)?.message ?? error}` }),
  });

// The bake's Mongo holds only what creating the org wrote, and every reference to the org in it is its ObjectId
// or that ID as a string. The org's Stripe customer is found by its metadata, so it moves too, or the box reuses
// the one an earlier bake moved. Redis may cache the old ID, and the API and worker have nothing else in it yet.
const moveSeedOrg = Effect.fn('moveSeedOrg')(function* (oldId: string) {
  const supervisor = yield* ProcessCompose;
  const { vars } = yield* BoxEnv;
  yield* supervisor.stopRunning(['api', 'worker']);
  const { MongoClient, ObjectId } = createRequire(`${REPO}/libs/dal/package.json`)('mongoose').mongo;
  const from = new ObjectId(oldId);
  const to = new ObjectId(SEED.novuOrgId);
  let found = 0;
  const swap = (value: Json): Json => {
    if (value?._bsontype === 'ObjectId') return value.equals(from) ? (found++, to) : value;
    if (value === oldId) return found++, SEED.novuOrgId;
    if (Array.isArray(value)) return value.map(swap);
    if (value?.constructor === Object)
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, swap(item)]));

    return value;
  };
  const client: Json = yield* mongo('mongo', () => MongoClient.connect(vars.MONGO_URL));
  yield* Effect.gen(function* () {
    const db = client.db();
    const moved = yield* mongo('moving the org', async () => {
      let moved = 0;
      for (const { name } of await db.listCollections({ type: 'collection' }, { nameOnly: true }).toArray()) {
        const collection = db.collection(name);
        for (const doc of await collection.find().toArray()) {
          found = 0;
          const next = swap(doc);
          if (!found) continue;
          if (from.equals(doc._id)) {
            await collection.deleteOne({ _id: from });
            await collection.insertOne(next);
          } else await collection.replaceOne({ _id: doc._id }, next);
          moved++;
        }
      }

      return moved;
    });
    const organizations = db.collection('organizations');
    const query = encodeURIComponent(`metadata['organizationId']:'${SEED.novuOrgId}'`);
    const [previous] = (yield* stripe(`/customers/search?query=${query}`)).data;
    const { stripeCustomerId }: Json = yield* mongo('the org', () => organizations.findOne({ _id: to }));
    if (previous)
      yield* mongo('the org', () => organizations.updateOne({ _id: to }, { $set: { stripeCustomerId: previous.id } }));
    else if (stripeCustomerId)
      yield* stripe(`/customers/${stripeCustomerId}`, { 'metadata[organizationId]': SEED.novuOrgId });
    const customer = previous ? `${previous.id} (from an earlier bake)` : (stripeCustomerId ?? 'none yet');
    log(`moved ${moved} documents from ${oldId} to ${SEED.novuOrgId}; Stripe customer ${customer}`);
  }).pipe(Effect.ensuring(Effect.promise(() => client.close())));
  for (const port of REDIS_PORTS) yield* redis(port, ['flushall']);
  for (const name of ['api', 'worker']) yield* supervisor.pc(['process', 'start', name]);
  yield* waitForHttp(API_HEALTH, 300);
  yield* waitForHttp(WORKER_HEALTH, 300);
});

// Email goes to Mailpit (UI on :8025); SMS, push and chat go to sink.ts, which shows them in Mailpit. Every
// environment of the seeded org gets the four providers, and the seeded user's subscriber (the default target of the
// dashboard's Test Workflow) gets a phone number, a push device token and a chat webhook, so a test run reaches all
// channels.
export const seedChannels = Effect.fn('seedChannels')(function* (token: string) {
  const me = yield* api('/v1/users/me', { headers: bearer(token) });
  const environments = yield* api('/v1/environments', { headers: bearer(token) });
  const integrations = [
    {
      providerId: 'nodemailer',
      channel: 'email',
      name: 'Mailpit',
      identifier: 'mailpit',
      primary: true,
      credentials: {
        host: MAIL_HOST,
        port: '1025',
        secure: false,
        ignoreTls: true,
        from: 'no-reply@novu-box.local',
        senderName: 'Novu Box',
      },
    },
    {
      providerId: 'generic-sms',
      channel: 'sms',
      name: 'Box SMS (sink)',
      identifier: 'box-sms',
      primary: true,
      credentials: {
        baseUrl: `${SINK_URL}/sms`,
        apiKeyRequestHeader: 'x-box-key',
        apiKey: 'box',
        idPath: 'id',
        datePath: 'date',
        from: 'Novu Box',
      },
    },
    {
      providerId: 'push-webhook',
      channel: 'push',
      name: 'Box Push (sink)',
      identifier: 'box-push',
      credentials: { webhookUrl: `${SINK_URL}/push`, secretKey: 'box-fake-push-hmac' },
    },
    {
      providerId: 'chat-webhook',
      channel: 'chat',
      name: 'Box Chat (sink)',
      identifier: 'box-chat',
      credentials: { secretKey: 'box-fake-chat-hmac' },
    },
  ];

  for (const environment of environments.data) {
    const headers = { Authorization: `ApiKey ${environment.apiKeys[0].key}` };
    for (const { primary, ...integration } of integrations) {
      const body = yield* api('/v1/integrations', {
        method: 'POST',
        headers,
        body: { ...integration, active: true, check: false },
      });
      if (primary) yield* api(`/v1/integrations/${body.data._id}/set-primary`, { method: 'POST', headers });
    }

    const subscriberId = me.data._id;
    yield* api('/v1/subscribers', {
      method: 'POST',
      headers,
      body: {
        subscriberId,
        email: me.data.email,
        firstName: me.data.firstName,
        lastName: me.data.lastName,
        phone: '+15550001',
      },
    });
    for (const [providerId, credentials] of [
      ['push-webhook', { deviceTokens: ['box-device-token'] }],
      ['chat-webhook', { webhookUrl: `${SINK_URL}/chat` }],
    ] as const) {
      yield* api(`/v1/subscribers/${subscriberId}/credentials`, {
        method: 'PUT',
        headers,
        body: { providerId, credentials },
      });
    }
    log(`email goes to Mailpit, SMS, push and chat to the sink in ${environment.name}`);
  }
});

// The bridge app serves the Development environment, so it signs with that environment's secret key. The key
// belongs to this box's own Mongo data, like every other seeded record.
export const seedBridge = Effect.fn('seedBridge')(function* (token: string) {
  const environments = yield* api('/v1/environments', { headers: bearer(token) });
  const development = environments.data.find((environment: Json) => environment.name === 'Development');
  fs.mkdirSync(dirname(BRIDGE_SECRET), { recursive: true });
  fs.writeFileSync(BRIDGE_SECRET, development.apiKeys[0].key, { mode: 0o600 });
  yield* syncBridge;
});

function bridgeKey(): string {
  return fs.readFileSync(BRIDGE_SECRET, 'utf8').trim();
}

// Same requests as `npx novu sync`: the API discovers the workflows from the bridge and stores them, then
// every agent the bridge serves gets the bridge URL. An agent the bridge serves for the first time (a PR can
// add one) is created and published to web chat, as a customer does in the dashboard before syncing.
export const syncBridge = Effect.gen(function* () {
  const headers = { Authorization: `ApiKey ${bridgeKey()}` };
  const { agents = [] } = yield* discoverBridge;
  const body = yield* api('/v1/bridge/sync?source=box', { method: 'POST', headers, body: { bridgeUrl: BRIDGE_URL } });
  for (const { agentId } of agents as Array<{ agentId: string }>) {
    if (!(yield* apiHas(`/v1/agents/${agentId}`, headers))) {
      yield* api('/v1/agents', { method: 'POST', headers, body: { name: agentId, identifier: agentId } });
      yield* api(`/v1/agents/${agentId}/integrations`, {
        method: 'POST',
        headers,
        body: { providerId: 'novu-web-chat' },
      });
      log(`agent ${agentId} is on web chat`);
    }
    yield* api(`/v1/agents/${agentId}/bridge`, { method: 'PUT', headers, body: { bridgeUrl: BRIDGE_URL } });
  }
  log(`bridge synced: ${body.data.length} workflows and ${agents.length} agents from ${BRIDGE_URL}`);
});

// Managed agents run on Anthropic with the key from the start env, so this runs at start, not at bake, and only
// with a key. The Novu-managed Claude integration is the one Novu adds to new Development environments when the
// key is set; it stores no key. The agent gets Haiku and only the bash tool, which asks for approval before it runs.
export const seedManagedAgent = Effect.gen(function* () {
  const supervisor = yield* ProcessCompose;
  yield* supervisor.pc(['process', 'start', 'thalamus']);
  yield* waitForHttp('http://127.0.0.1:8788/health', 120);
  const headers = { Authorization: `ApiKey ${bridgeKey()}` };
  if (yield* apiHas(`/v1/agents/${MANAGED_AGENT}`, headers)) return;
  const environment = yield* api('/v1/environments/me', { headers });
  const integrations = yield* api('/v1/integrations', { headers });
  let integration = integrations.data.find(
    (item: Json) => item.providerId === 'novu-anthropic' && item._environmentId === environment.data._id
  );
  integration ??= (yield* api('/v1/integrations', {
    method: 'POST',
    headers,
    body: { providerId: 'novu-anthropic', kind: 'agent', name: 'Novu Managed Claude', active: true, check: false },
  })).data;
  yield* api('/v1/agents', {
    method: 'POST',
    headers,
    body: {
      name: 'Box managed agent',
      identifier: MANAGED_AGENT,
      runtime: 'managed',
      managedRuntime: {
        providerId: 'novu-anthropic',
        integrationId: integration._id,
        model: 'claude-haiku-4-5',
        systemPrompt: 'You are the Novu Box test agent. Keep answers to one short sentence.',
        tools: ['bash'],
      },
    },
  });
  yield* api(`/v1/agents/${MANAGED_AGENT}/integrations`, {
    method: 'POST',
    headers,
    body: { providerId: 'novu-web-chat' },
  });
  log(`managed agent ${MANAGED_AGENT} is on web chat`);
});

// The CLI calls discover unsigned, which a bridge with strictAuthentication rejects; the box signs it like the API.
const discoverBridge = Effect.gen(function* () {
  yield* waitForHttp(`${BRIDGE_URL}?action=health-check`, 120);
  const timestamp = Date.now();
  const signature = createHmac('sha256', bridgeKey()).update(`${timestamp}.{}`).digest('hex');
  const answer = yield* request(`${BRIDGE_URL}?action=discover`, {
    headers: { 'novu-signature': `t=${timestamp},v1=${signature}` },
  });
  if (!answer.ok)
    return yield* new RequestFailed({ message: `bridge discover -> ${answer.status}: ${answer.text.slice(0, 300)}` });

  return JSON.parse(answer.text) as Json;
});

// The seeded org buys the Team tier the way a customer would: a test card on file and its subscription moved to
// the business prices. Novu's webhook handler, fed by the `stripe` process, then sets the tier in Mongo.
export const seedTeamTier = Effect.fn('seedTeamTier')(function* (token: string) {
  const auth = { headers: bearer(token) };
  const org = yield* api('/v1/organizations/me', auth);
  // Creates the Stripe customer and its Pro trial if creating the org didn't.
  yield* api('/v1/billing/subscription', auth);
  const { data: customers } = yield* stripe(
    `/customers?email=${encodeURIComponent(SEED.email)}&limit=100&expand[]=data.subscriptions`
  );
  const customer = customers.find((candidate: Json) => candidate.metadata.organizationId === org.data._id);
  const [subscription] = customer.subscriptions.data;
  const { data: prices } = yield* stripe(
    '/prices?lookup_keys[]=business_flat_monthly&lookup_keys[]=business_usage_notifications'
  );

  const card = yield* stripe('/payment_methods/pm_card_visa/attach', { customer: customer.id });
  yield* stripe(`/customers/${customer.id}`, { 'invoice_settings[default_payment_method]': card.id });
  const items: Record<string, string> = {};
  subscription.items.data.forEach((item: Json, index: number) => {
    items[`items[${index}][id]`] = item.id;
    items[`items[${index}][price]`] = prices.find(
      (price: Json) => price.recurring.usage_type === item.price.recurring.usage_type
    ).id;
  });
  yield* stripe(`/subscriptions/${subscription.id}`, { ...items, trial_end: 'now', proration_behavior: 'none' });

  for (let second = 1; second <= 60; second++) {
    yield* Effect.sleep(1000);
    const body = yield* api('/v1/billing/subscription', auth);
    if (body.data.apiServiceLevel === 'business' && body.data.status === 'active') {
      log(`${SEED.orgName} is on Team (customer ${customer.id})`);

      return;
    }
    // The first event can go out before `stripe listen` is connected; any update sends a new one.
    if (second % 15 === 0)
      yield* stripe(`/subscriptions/${subscription.id}`, { 'metadata[box_seeded_at]': new Date().toISOString() });
  }

  return yield* new BoxError({
    message: 'the org is not on Team after 60s; check the stripe process in /data/logs/process-compose.log',
  });
});
