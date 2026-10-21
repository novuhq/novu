import { encryptCredentials, generateAgentInboxRoutingKey } from '@novu/application-generic';
import { AgentIntegrationRepository, IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum, EmailProviderIdEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import axios from 'axios';
import { expect } from 'chai';
import { startTelegramApiStub } from '../../agents/e2e/helpers/telegram-api-stub';
import { AGENT_INBOX_DASHBOARD_SECRET_HEADER } from '../guards/human-dashboard-secret.guard';
import { CARD_NOT_AVAILABLE } from '../usecases/get-human-agent-card/get-human-agent-card.usecase';

const integrationRepository = new IntegrationRepository();
const agentIntegrationRepository = new AgentIntegrationRepository();

const INBOX_DOMAIN = 'agentinbox.md';
const DASHBOARD_SECRET = 'e2e-agent-card-dashboard-secret';

/** The username the Telegram API stub gives every bot. */
const STUB_BOT_USERNAME = 'novu_e2e_bot';

/**
 * The public card behind `agentinbox.md/p/{handle}`: read by anyone without signing in, holding only what the
 * card shows, and the same 404 for every card that can't be shown. The shared inbox domain is turned on for
 * this file only, as the test env leaves it unset.
 */
describe('Agent Inbox public agent card #novu-v2', () => {
  const originalEnv = {
    CI_EE_TEST: process.env.CI_EE_TEST,
    NOVU_ENTERPRISE: process.env.NOVU_ENTERPRISE,
    IS_SELF_HOSTED: process.env.IS_SELF_HOSTED,
    NOVU_AGENT_SHARED_INBOUND_DOMAIN: process.env.NOVU_AGENT_SHARED_INBOUND_DOMAIN,
    NOVU_AGENT_INBOX_INBOUND_DOMAIN: process.env.NOVU_AGENT_INBOX_INBOUND_DOMAIN,
    AGENT_INBOX_DASHBOARD_API_SECRET: process.env.AGENT_INBOX_DASHBOARD_API_SECRET,
  };

  before(async () => {
    process.env.CI_EE_TEST = 'true';
    process.env.NOVU_ENTERPRISE = 'true';
    delete process.env.IS_SELF_HOSTED;
    process.env.NOVU_AGENT_SHARED_INBOUND_DOMAIN = 'agentconnect.sh';
    process.env.NOVU_AGENT_INBOX_INBOUND_DOMAIN = INBOX_DOMAIN;
    process.env.AGENT_INBOX_DASHBOARD_API_SECRET = DASHBOARD_SECRET;
    await startTelegramApiStub();
  });

  after(() => {
    for (const [name, value] of Object.entries(originalEnv)) {
      restoreEnv(name, value);
    }
  });

  it('shows the card of an agent anyone can reach, without signing in, and nothing beyond it', async () => {
    const { handle } = await createAgent({ agentName: 'Atlas' });

    const res = await readCard(handle);

    expect(res.status).to.equal(200, JSON.stringify(res.data));
    const card = res.data.data;
    expect(Object.keys(card)).to.have.members(['handle', 'name', 'paused', 'operatorName', 'createdAt', 'address']);
    expect(card).to.include({
      handle,
      name: 'Atlas',
      paused: false,
      operatorName: 'Ada L.',
      address: `${handle}@${INBOX_DOMAIN}`,
    });
    // Of the operator's last name, a stranger gets the initial only.
    expect(JSON.stringify(res.data)).to.not.include('Lovelace');
    expect(Date.parse(card.createdAt)).to.be.closeTo(Date.now(), 60_000);
  });

  it('names an agent that still has the name setup gave it after its handle', async () => {
    const { handle } = await createAgent({});

    const res = await readCard(handle);

    expect(res.status).to.equal(200, JSON.stringify(res.data));
    expect(res.data.data.name).to.equal(handle.charAt(0).toUpperCase() + handle.slice(1));
  });

  it('shows the Telegram bot the agent talks through', async () => {
    const { session, handle, agentId } = await createAgent({ agentName: 'Atlas' });
    const bot = await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      providerId: ChatProviderIdEnum.Telegram,
      channel: ChannelTypeEnum.CHAT,
      credentials: encryptCredentials({ apiToken: '12345678:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' }),
      active: true,
      identifier: `telegram-card-e2e-${Date.now()}`,
      priority: 1,
      primary: false,
      deleted: false,
    });
    await agentIntegrationRepository.create({
      _agentId: agentId,
      _integrationId: bot._id,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    const res = await readCard(handle);

    expect(res.status).to.equal(200, JSON.stringify(res.data));
    expect(res.data.data.telegramBotUsername).to.equal(STUB_BOT_USERNAME);
  });

  it('says when the operator paused the agent', async () => {
    const { session, handle } = await createAgent({ agentName: 'Atlas' });
    await updateAgent(session, { paused: true });

    const res = await readCard(handle);

    expect(res.status).to.equal(200, JSON.stringify(res.data));
    expect(res.data.data.paused).to.equal(true);
  });

  it('has no card while only its contacts can reach the agent', async () => {
    const { session, handle } = await createAgent({ agentName: 'Atlas' });

    await updateAgent(session, { reach: 'contacts' });
    expectNotAvailable(await readCard(handle));

    await updateAgent(session, { reach: 'anyone' });
    expect((await readCard(handle)).status).to.equal(200);
  });

  it('gives a handle nobody has, a malformed one and a deleted agent the same 404', async () => {
    expectNotAvailable(await readCard(freshHandle()));
    expectNotAvailable(await readCard('Not%20A%20Handle'));

    const { session, handle } = await createAgent({ agentName: 'Atlas' });
    const deleted = await asDashboard(session, 'delete', '/v1/human/agent');
    expect(deleted.status).to.equal(204, JSON.stringify(deleted.body));

    expectNotAvailable(await readCard(handle));
  });

  it('finds an address made before handles could be chosen by its key, under its own slug only', async () => {
    // Without the shared domain, setup makes the agent without a mailbox, and the old kind is added by hand.
    const sharedDomain = process.env.NOVU_AGENT_SHARED_INBOUND_DOMAIN;
    delete process.env.NOVU_AGENT_SHARED_INBOUND_DOMAIN;
    const { session, agentId } = await createAgent({ agentName: 'Atlas' }).finally(() => {
      process.env.NOVU_AGENT_SHARED_INBOUND_DOMAIN = sharedDomain;
    });

    const inboxRoutingKey = generateAgentInboxRoutingKey();
    const inbox = await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      providerId: EmailProviderIdEnum.AgentEmailInbox,
      channel: ChannelTypeEnum.EMAIL,
      credentials: { inboxRoutingKey, emailSlugPrefix: 'atlas', inboxDomain: INBOX_DOMAIN },
      active: true,
      identifier: `agent-inbox-card-e2e-${Date.now()}`,
      deleted: false,
    });
    await agentIntegrationRepository.create({
      _agentId: agentId,
      _integrationId: inbox._id,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    const res = await readCard(`atlas-${inboxRoutingKey}`);

    expect(res.status).to.equal(200, JSON.stringify(res.data));
    expect(res.data.data).to.include({
      handle: `atlas-${inboxRoutingKey}`,
      name: 'Atlas',
      address: `atlas-${inboxRoutingKey}@${INBOX_DOMAIN}`,
    });
    expectNotAvailable(await readCard(`other-${inboxRoutingKey}`));
  });
});

/** Read as a stranger would: no key, no secret, no session. */
function readCard(handle: string) {
  // Where the API under test listens, as `UserSession` has it.
  const anonymous = axios.create({ baseURL: `http://127.0.0.1:${process.env.PORT}`, validateStatus: () => true });

  return anonymous.get(`/v1/human/agent-cards/${handle}`);
}

function expectNotAvailable(res: { status: number; data: Record<string, any> }) {
  expect(res.status).to.equal(404, JSON.stringify(res.data));
  expect(res.data).to.include({ code: CARD_NOT_AVAILABLE, message: 'This card isn’t available.' });
}

function freshHandle(): string {
  return `atlas${Math.random().toString(36).slice(2, 10)}`;
}

/** An Agent Inbox account with its agent, made as the dashboard's onboarding makes it. */
async function createAgent({ agentName }: { agentName?: string }) {
  const session = new UserSession();
  await session.initialize();

  const handle = freshHandle();
  const res = await asDashboard(session, 'post', '/v1/human/setup').send({
    operator: true,
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@acme.co',
    inboxHandle: handle,
    ...(agentName ? { agentName } : {}),
  });
  expect(res.status).to.equal(200, JSON.stringify(res.body));

  return { session, handle, agentId: res.body.data.agentId as string };
}

async function updateAgent(session: UserSession, body: Record<string, unknown>) {
  const res = await asDashboard(session, 'patch', '/v1/human/agent').send(body);
  expect(res.status).to.equal(200, JSON.stringify(res.body));
}

function asDashboard(session: UserSession, method: 'post' | 'patch' | 'delete', path: string) {
  return session.testAgent[method](path)
    .set('Authorization', `ApiKey ${session.apiKey}`)
    .set(AGENT_INBOX_DASHBOARD_SECRET_HEADER, DASHBOARD_SECRET);
}

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];

    return;
  }

  process.env[name] = value;
}
