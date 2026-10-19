import * as z from 'zod';
import { log } from '../node/main.ts';
import { poll } from '../node/poll.ts';
import {
  ApiCreated,
  ApiEnvironments,
  ApiOrganization,
  ApiSubscription,
  ApiUser,
  StripeCustomers,
  StripePrices,
  WithId,
} from '../shared/contracts.ts';
import { api, stripe } from './api.ts';
import { SEED, testUserOrg, userToken } from './clerk.ts';
import { MAIL_HOST, SINK_URL } from './paths.ts';

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

const INTEGRATIONS = [
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

export async function seedChannels(token: string): Promise<void> {
  const me = (await api('/v1/users/me', ApiUser, { headers: bearer(token) })).data;
  const environments = (await api('/v1/environments', ApiEnvironments, { headers: bearer(token) })).data;
  for (const environment of environments) {
    const headers = { Authorization: `ApiKey ${environment.apiKeys[0]?.key}` };
    for (const { primary, ...integration } of INTEGRATIONS) {
      const body = { ...integration, active: true, check: false };
      const created = await api('/v1/integrations', ApiCreated, { method: 'POST', headers, json: body });
      if (primary)
        await api(`/v1/integrations/${created.data._id}/set-primary`, z.unknown(), { method: 'POST', headers });
    }
    const subscriber = { subscriberId: me._id, email: me.email, firstName: me.firstName, lastName: me.lastName };
    await api('/v1/subscribers', z.unknown(), { method: 'POST', headers, json: { ...subscriber, phone: '+15550001' } });
    for (const [providerId, credentials] of [
      ['push-webhook', { deviceTokens: ['box-device-token'] }],
      ['chat-webhook', { webhookUrl: `${SINK_URL}/chat` }],
    ] as const) {
      await api(`/v1/subscribers/${me._id}/credentials`, z.unknown(), {
        method: 'PUT',
        headers,
        json: { providerId, credentials },
      });
    }
    log(`email goes to Mailpit, SMS, push and chat to the sink in ${environment.name}`);
  }
}

async function testUserToken(email: string): Promise<string> {
  const { user, org } = await testUserOrg(email);
  const token = await userToken(user.id, org.id);
  const novuOrg = (await api('/v1/organizations/me', ApiOrganization, { headers: bearer(token) })).data;
  if (novuOrg._id === SEED.novuOrgId) throw new Error(`${email}'s org is the seed org; leave it as it is`);

  return token;
}

export async function teamTestUser(email: string): Promise<void> {
  await seedTeamTier(await testUserToken(email), email);
}

export async function channelsTestUser(email: string): Promise<void> {
  await seedChannels(await testUserToken(email));
}

export async function seedTeamTier(token: string, email = SEED.email): Promise<void> {
  const auth = { headers: bearer(token) };
  const org = (await api('/v1/organizations/me', ApiOrganization, auth)).data;
  await api('/v1/billing/subscription', ApiSubscription, auth);
  const { data: customers } = await stripe(
    `/customers?email=${encodeURIComponent(email)}&limit=100&expand[]=data.subscriptions`,
    StripeCustomers
  );
  const customer = customers.find((candidate) => candidate.metadata.organizationId === org._id);
  const subscription = customer?.subscriptions?.data[0];
  if (!customer || !subscription) throw new Error(`no Stripe subscription for the org ${org._id}`);
  const { data: prices } = await stripe(
    '/prices?lookup_keys[]=business_flat_monthly&lookup_keys[]=business_usage_notifications',
    StripePrices
  );

  const card = await stripe('/payment_methods/pm_card_visa/attach', WithId, { customer: customer.id });
  await stripe(`/customers/${customer.id}`, WithId, { 'invoice_settings[default_payment_method]': card.id });
  const items: Record<string, string> = {};
  subscription.items.data.forEach((item, index) => {
    const price = prices.find((candidate) => candidate.recurring.usage_type === item.price.recurring.usage_type);
    if (!price) throw new Error(`no business price for ${item.price.recurring.usage_type} usage`);
    items[`items[${index}][id]`] = item.id;
    items[`items[${index}][price]`] = price.id;
  });
  await stripe(`/subscriptions/${subscription.id}`, WithId, { ...items, trial_end: 'now', proration_behavior: 'none' });

  let checks = 0;
  await poll(
    async () => {
      const { data } = await api('/v1/billing/subscription', ApiSubscription, auth);
      if (data.apiServiceLevel === 'business' && data.status === 'active') return true;
      // The first event can go out before `stripe listen` is connected; any update sends a new one.
      if (++checks % 15 === 0)
        await stripe(`/subscriptions/${subscription.id}`, WithId, {
          'metadata[box_seeded_at]': new Date().toISOString(),
        });

      return false;
    },
    {
      timeoutMs: 60_000,
      orElse: () => {
        throw new Error('the org is not on Team after 60s; check the stripe process in /data/logs/process-compose.log');
      },
    }
  );
  log(`${org.name} (${org._id}) is on Team (customer ${customer.id})`);
}
