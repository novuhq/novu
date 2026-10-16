// What a bake seeds through the box's own API (the Clerk user and org, integrations, the Team tier), and the bridge
// app's sync, which start and apply run again.

import { createHmac } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { clerk, findSeedUser, SEED, seedPassword, seedUserToken } from './clerk.mjs';
import {
  API_HEALTH,
  BRIDGE_SECRET,
  BRIDGE_URL,
  env,
  log,
  MAIL_HOST,
  MANAGED_AGENT,
  pc,
  REDIS_PORTS,
  REPO,
  SINK_URL,
  step,
  stopRunning,
  WORKER_HEALTH,
  waitForHttp,
} from './lib.mjs';
import { redis } from './migrate.mjs';

export async function api(path, { headers = {}, ...init } = {}) {
  const res = await fetch(`http://127.0.0.1:3000${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Origin: env.FRONT_BASE_URL, ...headers },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} -> ${res.status}: ${text.slice(0, 300)}`);

  return { res, body: text ? JSON.parse(text) : null };
}

// The API creates the Novu user and org from the Clerk ones on their first request, as in production.
// The user keeps the Novu ID Clerk holds for it. The org gets a random one, and the Clerk org every box shares
// would then link to this box only, so the seed moves it to SEED.novuOrgId, which is the same in every box.
// The password is set on every bake, so BOX_SEED_PASSWORD is the one place it changes.
export async function seedClerk() {
  let { user, org } = await findSeedUser();
  const password = seedPassword();
  if (user) await clerk(`/users/${user.id}`, { method: 'PATCH', body: { password, skip_password_checks: true } });
  else
    user = await clerk('/users', {
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
  org ??= await clerk('/organizations', { method: 'POST', body: { name: SEED.orgName, created_by: user.id } });
  const linkOrg = (externalOrgId) =>
    clerk(`/organizations/${org.id}/metadata`, { method: 'PATCH', body: { public_metadata: { externalOrgId } } });
  const me = async () => {
    const token = await seedUserToken({ userId: user.id, orgId: org.id });
    const { body } = await api('/v1/organizations/me', { headers: { Authorization: `Bearer ${token}` } });

    return { token, org: body.data };
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
// or that ID as a string. The org's Stripe customer is found by its metadata, so it moves too, or the box reuses
// the one an earlier bake moved. Redis may cache the old ID, and the API and worker have nothing else in it yet.
async function moveSeedOrg(oldId) {
  await stopRunning(['api', 'worker']);
  const { MongoClient, ObjectId } = createRequire(`${REPO}/libs/dal/package.json`)('mongoose').mongo;
  const from = new ObjectId(oldId);
  const to = new ObjectId(SEED.novuOrgId);
  let found = 0;
  const swap = (value) => {
    if (value?._bsontype === 'ObjectId') return value.equals(from) ? (found++, to) : value;
    if (value === oldId) return found++, SEED.novuOrgId;
    if (Array.isArray(value)) return value.map(swap);
    if (value?.constructor === Object)
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, swap(item)]));

    return value;
  };
  const client = await MongoClient.connect(env.MONGO_URL);
  try {
    const db = client.db();
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
    const organizations = db.collection('organizations');
    const query = encodeURIComponent(`metadata['organizationId']:'${SEED.novuOrgId}'`);
    const [previous] = (await stripe(`/customers/search?query=${query}`)).data;
    const { stripeCustomerId } = await organizations.findOne({ _id: to });
    if (previous) await organizations.updateOne({ _id: to }, { $set: { stripeCustomerId: previous.id } });
    else if (stripeCustomerId)
      await stripe(`/customers/${stripeCustomerId}`, { 'metadata[organizationId]': SEED.novuOrgId });
    const customer = previous ? `${previous.id} (from an earlier bake)` : (stripeCustomerId ?? 'none yet');
    log(`moved ${moved} documents from ${oldId} to ${SEED.novuOrgId}; Stripe customer ${customer}`);
  } finally {
    await client.close();
  }
  for (const port of REDIS_PORTS) redis(port, ['flushall']);
  for (const name of ['api', 'worker']) pc(['process', 'start', name]);
  await waitForHttp(API_HEALTH, 300);
  await waitForHttp(WORKER_HEALTH, 300);
}

// Every environment of the seeded org sends email through Mailpit (UI on :8025).
export async function seedEmailIntegration(token) {
  const { body: environments } = await api('/v1/environments', { headers: { Authorization: `Bearer ${token}` } });
  for (const environment of environments.data) {
    const headers = { Authorization: `ApiKey ${environment.apiKeys[0].key}` };
    const { body } = await api('/v1/integrations', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        providerId: 'nodemailer',
        channel: 'email',
        name: 'Mailpit',
        identifier: 'mailpit',
        active: true,
        check: false,
        credentials: {
          host: MAIL_HOST,
          port: '1025',
          secure: false,
          ignoreTls: true,
          from: 'no-reply@novu-box.local',
          senderName: 'Novu Box',
        },
      }),
    });
    await api(`/v1/integrations/${body.data._id}/set-primary`, { method: 'POST', headers });
    log(`Mailpit is the primary email integration in ${environment.name}`);
  }
}

// SMS, push and chat go to sink.mjs, which shows them in Mailpit. Every environment gets the three HTTP
// providers, and the seeded user's subscriber (the default target of the dashboard's Test Workflow) gets
// a phone number, a push device token and a chat webhook, so a test run reaches all channels.
export async function seedChannels(token) {
  const auth = { Authorization: `Bearer ${token}` };
  const { body: me } = await api('/v1/users/me', { headers: auth });
  const { body: environments } = await api('/v1/environments', { headers: auth });
  const integrations = [
    {
      providerId: 'generic-sms',
      channel: 'sms',
      name: 'Box SMS (sink)',
      identifier: 'box-sms',
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
    for (const integration of integrations) {
      const { body } = await api('/v1/integrations', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...integration, active: true, check: false }),
      });
      if (integration.channel === 'sms')
        await api(`/v1/integrations/${body.data._id}/set-primary`, { method: 'POST', headers });
    }

    const subscriberId = me.data._id;
    await api('/v1/subscribers', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        subscriberId,
        email: me.data.email,
        firstName: me.data.firstName,
        lastName: me.data.lastName,
        phone: '+15550001',
      }),
    });
    for (const [providerId, credentials] of [
      ['push-webhook', { deviceTokens: ['box-device-token'] }],
      ['chat-webhook', { webhookUrl: `${SINK_URL}/chat` }],
    ]) {
      await api(`/v1/subscribers/${subscriberId}/credentials`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ providerId, credentials }),
      });
    }
    log(`SMS, push and chat go to the sink in ${environment.name}`);
  }
}

// The bridge app serves the Development environment, so it signs with that environment's secret key. The key
// belongs to this box's own Mongo data, like every other seeded record.
export async function seedBridge(token) {
  const { body: environments } = await api('/v1/environments', { headers: { Authorization: `Bearer ${token}` } });
  const development = environments.data.find((environment) => environment.name === 'Development');
  fs.mkdirSync(dirname(BRIDGE_SECRET), { recursive: true });
  fs.writeFileSync(BRIDGE_SECRET, development.apiKeys[0].key, { mode: 0o600 });
  await syncBridge();
}

function bridgeKey() {
  return fs.readFileSync(BRIDGE_SECRET, 'utf8').trim();
}

// Same requests as `npx novu sync`: the API discovers the workflows from the bridge and stores them, then
// every agent the bridge serves gets the bridge URL. An agent the bridge serves for the first time (a PR can
// add one) is created and published to web chat, as a customer does in the dashboard before syncing.
export async function syncBridge() {
  const headers = { Authorization: `ApiKey ${bridgeKey()}` };
  const { agents = [] } = await discoverBridge();
  const { body } = await api('/v1/bridge/sync?source=box', {
    method: 'POST',
    headers,
    body: JSON.stringify({ bridgeUrl: BRIDGE_URL }),
  });
  for (const { agentId } of agents) {
    if (
      !(await api(`/v1/agents/${agentId}`, { headers }).then(
        () => true,
        () => false
      ))
    ) {
      await api('/v1/agents', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: agentId, identifier: agentId }),
      });
      await api(`/v1/agents/${agentId}/integrations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ providerId: 'novu-web-chat' }),
      });
      log(`agent ${agentId} is on web chat`);
    }
    await api(`/v1/agents/${agentId}/bridge`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ bridgeUrl: BRIDGE_URL }),
    });
  }
  log(`bridge synced: ${body.data.length} workflows and ${agents.length} agents from ${BRIDGE_URL}`);
}

// Managed agents run on Anthropic with the key from the start env, so this runs at start, not at bake, and only
// with a key. The Novu-managed Claude integration is the one Novu adds to new Development environments when the
// key is set; it stores no key. The agent gets Haiku and only the bash tool, which asks for approval before it runs.
export async function seedManagedAgent() {
  pc(['process', 'start', 'thalamus']);
  await waitForHttp('http://127.0.0.1:8788/health', 120);
  const headers = { Authorization: `ApiKey ${bridgeKey()}` };
  if (
    await api(`/v1/agents/${MANAGED_AGENT}`, { headers }).then(
      () => true,
      () => false
    )
  )
    return;
  const { body: environment } = await api('/v1/environments/me', { headers });
  const { body: integrations } = await api('/v1/integrations', { headers });
  let integration = integrations.data.find(
    (item) => item.providerId === 'novu-anthropic' && item._environmentId === environment.data._id
  );
  integration ??= (
    await api('/v1/integrations', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        providerId: 'novu-anthropic',
        kind: 'agent',
        name: 'Novu Managed Claude',
        active: true,
        check: false,
      }),
    })
  ).body.data;
  await api('/v1/agents', {
    method: 'POST',
    headers,
    body: JSON.stringify({
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
    }),
  });
  await api(`/v1/agents/${MANAGED_AGENT}/integrations`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ providerId: 'novu-web-chat' }),
  });
  log(`managed agent ${MANAGED_AGENT} is on web chat`);
}

// The CLI calls discover unsigned, which a bridge with strictAuthentication rejects; the box signs it like the API.
async function discoverBridge() {
  await waitForHttp(`${BRIDGE_URL}?action=health-check`, 120);
  const timestamp = Date.now();
  const signature = createHmac('sha256', bridgeKey()).update(`${timestamp}.{}`).digest('hex');
  const res = await fetch(`${BRIDGE_URL}?action=discover`, {
    headers: { 'novu-signature': `t=${timestamp},v1=${signature}` },
  });
  if (!res.ok) throw new Error(`bridge discover -> ${res.status}: ${(await res.text()).slice(0, 300)}`);

  return res.json();
}

async function stripe(path, body) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${env.STRIPE_API_KEY}`, 'Stripe-Version': '2022-11-15' },
    body: body && new URLSearchParams(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Stripe ${path} -> ${res.status}: ${json.error?.message}`);

  return json;
}

// The seeded org buys the Team tier the way a customer would: a test card on file and its subscription moved to
// the business prices. Novu's webhook handler, fed by the `stripe` process, then sets the tier in Mongo.
export async function seedTeamTier(token) {
  const auth = { headers: { Authorization: `Bearer ${token}` } };
  const { body: org } = await api('/v1/organizations/me', auth);
  // Creates the Stripe customer and its Pro trial if creating the org didn't.
  await api('/v1/billing/subscription', auth);
  const { data: customers } = await stripe(
    `/customers?email=${encodeURIComponent(SEED.email)}&limit=100&expand[]=data.subscriptions`
  );
  const customer = customers.find((candidate) => candidate.metadata.organizationId === org.data._id);
  const [subscription] = customer.subscriptions.data;
  const { data: prices } = await stripe(
    '/prices?lookup_keys[]=business_flat_monthly&lookup_keys[]=business_usage_notifications'
  );

  const card = await stripe('/payment_methods/pm_card_visa/attach', { customer: customer.id });
  await stripe(`/customers/${customer.id}`, { 'invoice_settings[default_payment_method]': card.id });
  const items = {};
  subscription.items.data.forEach((item, index) => {
    items[`items[${index}][id]`] = item.id;
    items[`items[${index}][price]`] = prices.find(
      (price) => price.recurring.usage_type === item.price.recurring.usage_type
    ).id;
  });
  await stripe(`/subscriptions/${subscription.id}`, { ...items, trial_end: 'now', proration_behavior: 'none' });

  for (let second = 1; second <= 60; second++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const { body } = await api('/v1/billing/subscription', auth);
    if (body.data.apiServiceLevel === 'business' && body.data.status === 'active') {
      log(`${SEED.orgName} is on Team (customer ${customer.id})`);

      return;
    }
    // The first event can go out before `stripe listen` is connected; any update sends a new one.
    if (second % 15 === 0)
      await stripe(`/subscriptions/${subscription.id}`, { 'metadata[box_seeded_at]': new Date().toISOString() });
  }
  throw new Error('the org is not on Team after 60s; check the stripe process in /data/logs/process-compose.log');
}
