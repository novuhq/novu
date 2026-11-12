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

/** The look an agent has until its operator picks one. */
const ORIGINAL_LOOK = { shape: 'orb', color: 'ember', art: { kind: 'rays', seed: 0 } };

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
    expect(Object.keys(card)).to.have.members([
      'handle',
      'name',
      'paused',
      'operatorName',
      'operatorFirstName',
      'createdAt',
      'address',
      'look',
      'newCard',
    ]);
    expect(card).to.include({
      handle,
      name: 'Atlas',
      paused: false,
      operatorName: 'Ada L.',
      operatorFirstName: 'Ada',
      address: `${handle}@${INBOX_DOMAIN}`,
      // `IS_AGENT_INBOX_NEW_ONBOARDING_ENABLED` is off unless an account gets it.
      newCard: false,
    });
    // Nobody picked a look for this agent: it has the original one.
    expect(card.look).to.deep.equal(ORIGINAL_LOOK);
    // Of the operator's last name, a stranger gets the initial only.
    expect(JSON.stringify(res.data)).to.not.include('Lovelace');
    expect(Date.parse(card.createdAt)).to.be.closeTo(Date.now(), 60_000);
  });

  it('names the operator on the Configure page as the public card does', async () => {
    const { session, handle } = await createAgent({ agentName: 'Atlas' });

    const own = await asDashboard(session, 'get', '/v1/human/agent');
    const card = await readCard(handle);

    expect(own.status).to.equal(200, JSON.stringify(own.body));
    expect(own.body.data).to.include({ operatorName: 'Ada L.', operatorFirstName: 'Ada' });
    expect(card.data.data).to.include({
      operatorName: own.body.data.operatorName,
      operatorFirstName: own.body.data.operatorFirstName,
    });
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

  it('finds an address made before handles could be chosen by its key, even with the longest slug', async () => {
    // Without the shared domain, setup makes the agent without a mailbox, and the old kind is added by hand.
    const sharedDomain = process.env.NOVU_AGENT_SHARED_INBOUND_DOMAIN;
    delete process.env.NOVU_AGENT_SHARED_INBOUND_DOMAIN;
    const { session, agentId } = await createAgent({ agentName: 'Atlas' }).finally(() => {
      process.env.NOVU_AGENT_SHARED_INBOUND_DOMAIN = sharedDomain;
    });

    // A slug as long as a handle can be: with the hyphen and the key, the card's handle is 41 characters.
    const slug = 'atlas-the-agents-of-ada-lovelace';
    const inboxRoutingKey = generateAgentInboxRoutingKey();
    const inbox = await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      providerId: EmailProviderIdEnum.AgentEmailInbox,
      channel: ChannelTypeEnum.EMAIL,
      credentials: { inboxRoutingKey, emailSlugPrefix: slug, inboxDomain: INBOX_DOMAIN },
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

    const handle = `${slug}-${inboxRoutingKey}`;
    expect(handle).to.have.length(41);
    const res = await readCard(handle);

    expect(res.status).to.equal(200, JSON.stringify(res.data));
    expect(res.data.data).to.include({ handle, name: 'Atlas', address: `${handle}@${INBOX_DOMAIN}` });
    expectNotAvailable(await readCard(`other-${inboxRoutingKey}`));
  });

  it('keeps the look the operator picked on the dashboard, and ignores one a host sends', async () => {
    const picked = { shape: 'bean', color: 'marigold', art: { kind: 'waves', seed: 4242 } };
    const { session, handle } = await createAgent({ agentName: 'Atlas', look: picked });

    expect((await readCard(handle)).data.data.look).to.deep.equal(picked);
    const agent = await asDashboard(session, 'get', '/v1/human/agent');
    expect(agent.body.data.look).to.deep.equal(picked);

    // Hosts hold the same key, but the look is the operator's to pick: setup from a host leaves the original one.
    const hostSession = new UserSession();
    await hostSession.initialize();
    const hostHandle = freshHandle();
    const fromHost = await hostSession.testAgent
      .post('/v1/human/setup')
      .set('Authorization', `ApiKey ${hostSession.apiKey}`)
      .send({ operator: true, firstName: 'Ada', inboxHandle: hostHandle, agentName: 'Juno', look: picked });
    expect(fromHost.status).to.equal(200, JSON.stringify(fromHost.body));
    expect((await readCard(hostHandle)).data.data.look).to.deep.equal(ORIGINAL_LOOK);
  });

  it('refuses a look it doesn’t know', async () => {
    const session = new UserSession();
    await session.initialize();

    const res = await asDashboard(session, 'post', '/v1/human/setup').send({
      operator: true,
      inboxHandle: freshHandle(),
      look: { shape: 'cube', color: 'ember', art: { kind: 'rays', seed: 1 } },
    });

    expect(res.status).to.equal(422, JSON.stringify(res.body));
  });

  it('shows the card to a host, and keeps the first showing with the host that showed it', async () => {
    const { session, handle } = await createAgent({ agentName: 'Atlas' });

    const first = await showCard(session, { via: 'cli', host: 'claude-code' });
    expect(first.status).to.equal(200, JSON.stringify(first.body));
    expect(first.body.data).to.deep.equal({
      greeting:
        'Hi Ada, I’m Atlas. I have my own inbox now. Here’s my card, so people can email or message me directly.',
      name: 'Atlas',
      handle,
      address: `${handle}@${INBOX_DOMAIN}`,
      url: `${(process.env.HUMAN_DASHBOARD_URL || 'https://agentinbox.md').replace(/\/$/, '')}/p/${handle}`,
      look: ORIGINAL_LOOK,
      operatorFirstName: 'Ada',
      firstShown: true,
    });

    const again = await showCard(session, { via: 'mcp', host: 'chatgpt' });
    expect(again.status).to.equal(200, JSON.stringify(again.body));
    expect(again.body.data.firstShown).to.equal(false);

    // The first showing stays the one the dashboard's onboarding reads, with the host that showed it.
    const agent = await asDashboard(session, 'get', '/v1/human/agent');
    expect(agent.body.data.cardShown).to.deep.include({ via: 'cli', host: 'claude-code' });
    const status = await asDashboard(session, 'get', '/v1/human/agent/hosts');
    expect(status.body.data.cardShown).to.deep.equal(agent.body.data.cardShown);
    // Showing the card connected both hosts.
    expect(status.body.data.hosts.map((host: { id: string }) => host.id).sort()).to.deep.equal([
      'chatgpt',
      'claude-code',
    ]);
  });

  it('leaves the link out while only its contacts can reach the agent', async () => {
    const { session, handle } = await createAgent({ agentName: 'Atlas' });
    await updateAgent(session, { reach: 'contacts' });

    const res = await showCard(session, { via: 'cli' });

    expect(res.status).to.equal(200, JSON.stringify(res.body));
    expect(res.body.data).to.include({ handle, address: `${handle}@${INBOX_DOMAIN}` });
    expect(res.body.data).to.not.have.property('url');
  });
});

/** What a host sends when it shows the card: the account's key, and the way in and the host it is. */
function showCard(session: UserSession, { via, host }: { via: 'cli' | 'mcp'; host?: string }) {
  const req = session.testAgent
    .post('/v1/human/agent/card')
    .set('Authorization', `ApiKey ${session.apiKey}`)
    .set('agent-inbox-via', via)
    .set('Novu-Analytics-Source', via);

  return (host ? req.set('agent-inbox-host', host) : req).send({});
}

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
async function createAgent({ agentName, look }: { agentName?: string; look?: Record<string, unknown> }) {
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
    ...(look ? { look } : {}),
  });
  expect(res.status).to.equal(200, JSON.stringify(res.body));

  return { session, handle, agentId: res.body.data.agentId as string };
}

async function updateAgent(session: UserSession, body: Record<string, unknown>) {
  const res = await asDashboard(session, 'patch', '/v1/human/agent').send(body);
  expect(res.status).to.equal(200, JSON.stringify(res.body));
}

function asDashboard(session: UserSession, method: 'get' | 'post' | 'patch' | 'delete', path: string) {
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
