import { MailFactory } from '@novu/application-generic';
import { IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, EmailProviderIdEnum, type IEmailOptions } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { AGENT_INBOX_DASHBOARD_SECRET_HEADER, DASHBOARD_ONLY } from '../guards/human-dashboard-secret.guard';

const integrationRepository = new IntegrationRepository();

const INBOX_DOMAIN = 'agentinbox.md';
const OPERATOR_EMAIL = 'ada@acme.co';
const DASHBOARD_SECRET = 'e2e-inbox-address-dashboard-secret';

/**
 * Creating an Agent Inbox at an address the operator chose, and the same mailbox from `setup --agent-name`.
 * Onboarding also asks for the mailbox domain before a handle exists.
 * The shared domain is turned on for this file only: the test env leaves it unset, which skips the mailbox.
 */
describe('Agent Inbox address (create, taken, test email, CLI) #novu-v2', () => {
  const originalEnv = {
    CI_EE_TEST: process.env.CI_EE_TEST,
    NOVU_ENTERPRISE: process.env.NOVU_ENTERPRISE,
    IS_SELF_HOSTED: process.env.IS_SELF_HOSTED,
    NOVU_AGENT_SHARED_INBOUND_DOMAIN: process.env.NOVU_AGENT_SHARED_INBOUND_DOMAIN,
    NOVU_AGENT_INBOX_INBOUND_DOMAIN: process.env.NOVU_AGENT_INBOX_INBOUND_DOMAIN,
    AGENT_INBOX_DASHBOARD_API_SECRET: process.env.AGENT_INBOX_DASHBOARD_API_SECRET,
  };

  before(() => {
    process.env.CI_EE_TEST = 'true';
    process.env.NOVU_ENTERPRISE = 'true';
    delete process.env.IS_SELF_HOSTED;
    process.env.NOVU_AGENT_SHARED_INBOUND_DOMAIN = 'agentconnect.sh';
    process.env.NOVU_AGENT_INBOX_INBOUND_DOMAIN = INBOX_DOMAIN;
    process.env.AGENT_INBOX_DASHBOARD_API_SECRET = DASHBOARD_SECRET;
  });

  after(() => {
    restoreEnv('CI_EE_TEST', originalEnv.CI_EE_TEST);
    restoreEnv('NOVU_ENTERPRISE', originalEnv.NOVU_ENTERPRISE);
    restoreEnv('IS_SELF_HOSTED', originalEnv.IS_SELF_HOSTED);
    restoreEnv('NOVU_AGENT_SHARED_INBOUND_DOMAIN', originalEnv.NOVU_AGENT_SHARED_INBOUND_DOMAIN);
    restoreEnv('NOVU_AGENT_INBOX_INBOUND_DOMAIN', originalEnv.NOVU_AGENT_INBOX_INBOUND_DOMAIN);
    restoreEnv('AGENT_INBOX_DASHBOARD_API_SECRET', originalEnv.AGENT_INBOX_DASHBOARD_API_SECRET);
  });

  it('creates the agent at the handle the operator chose, once that handle is free', async () => {
    const session = await startSession();
    const chosen = freshHandle();

    const free = await checkAddress(session, chosen);
    expect(free).to.deep.equal({ handle: chosen, available: true, domain: INBOX_DOMAIN });

    const created = await createFromDashboard(session, { agentName: 'Atlas', inboxHandle: chosen });

    expect(created.agentName).to.equal('Atlas');
    expect(created.emailAddress).to.equal(addressOf(chosen));
    expect(created).to.not.have.property('emailHandleAdjusted');
    await expectVanityInbox(session, chosen);

    const taken = await checkAddress(session, chosen);
    expect(taken.available).to.equal(false);
    expect(taken.suggestion).to.equal(`${chosen}-acme`);
  });

  it('refuses a taken handle and offers the nearby free one', async () => {
    const first = await startSession();
    const chosen = freshHandle();
    await createFromDashboard(first, { agentName: 'Atlas', inboxHandle: chosen });

    const second = await startSession();
    const check = await checkAddress(second, chosen);
    expect(check).to.deep.equal({
      handle: chosen,
      available: false,
      suggestion: `${chosen}-acme`,
      domain: INBOX_DOMAIN,
    });

    const refused = await asDashboard(second, 'post', '/v1/human/setup').send(
      dashboardSetup({ agentName: 'Atlas', inboxHandle: chosen })
    );
    expect(refused.status).to.equal(409, JSON.stringify(refused.body));
    expect(refused.body.code).to.equal('inbox_address_taken');
    expect(refused.body.message).to.equal(`${chosen} is taken`);
    expect(refused.body.suggestion).to.equal(`${chosen}-acme`);

    const created = await createFromDashboard(second, { agentName: 'Atlas', inboxHandle: `${chosen}-acme` });
    expect(created.emailAddress).to.equal(addressOf(`${chosen}-acme`));
    await expectVanityInbox(second, `${chosen}-acme`);

    const again = await asDashboard(first, 'post', '/v1/human/setup').send(
      dashboardSetup({ agentName: 'Atlas renamed', inboxHandle: chosen })
    );
    expect(again.status).to.equal(200, JSON.stringify(again.body));
    expect(again.body.data).to.not.have.property('emailAddress');
    await expectVanityInbox(first, chosen);
  });

  it('sends the test email from that inbox, and only from the dashboard', async () => {
    const session = await startSession();
    const chosen = freshHandle();
    await createFromDashboard(session, { agentName: 'Atlas', inboxHandle: chosen });

    const fromCli = await asCli(session, 'post', '/v1/human/agent/test-email').send({ email: OPERATOR_EMAIL });
    expect(fromCli.status).to.equal(403, JSON.stringify(fromCli.body));
    expect(fromCli.body.code).to.equal(DASHBOARD_ONLY);

    const empty = await startSession();
    const missing = await asDashboard(empty, 'post', '/v1/human/agent/test-email').send({ email: OPERATOR_EMAIL });
    expect(missing.status).to.equal(404, JSON.stringify(missing.body));

    const sent: IEmailOptions[] = [];
    const restoreMail = captureOutboundMail(sent);

    try {
      const first = await asDashboard(session, 'post', '/v1/human/agent/test-email').send({ email: OPERATOR_EMAIL });
      const second = await asDashboard(session, 'post', '/v1/human/agent/test-email').send({ email: OPERATOR_EMAIL });

      expect(first.status).to.equal(200, JSON.stringify(first.body));
      expect(first.body.data).to.deep.equal({ success: true });
      expect(second.status).to.equal(200, JSON.stringify(second.body));
      expect(sent).to.have.length(2);
      for (const mail of sent) {
        expect(mail.to).to.deep.equal([OPERATOR_EMAIL]);
        expect(mail.from).to.equal(addressOf(chosen));
        expect(mail.senderName).to.equal('Atlas');
        expect(mail.subject).to.equal('Hi, I’m Atlas');
        expect(mail.text).to.include('Reply to this email. Your reply lands in my inbox.');
      }
    } finally {
      restoreMail();
    }
  });

  it('claims the slug of the name from the CLI, and walks to a free neighbour when that slug is taken', async () => {
    const session = await startSession();
    const slug = freshHandle();

    const created = await createFromCli(session, { agentName: slug });
    expect(created.agentName).to.equal(slug);
    expect(created.emailAddress).to.equal(addressOf(slug));
    expect(created).to.not.have.property('emailHandleAdjusted');
    await expectVanityInbox(session, slug);

    const again = await createFromCli(session, { agentName: `${slug} renamed` });
    expect(again).to.not.have.property('emailAddress');
    await expectVanityInbox(session, slug);

    const reservedSession = await startSession();
    const reserved = await createFromCli(reservedSession, { agentName: 'Support' });
    expect(reserved.emailHandleAdjusted).to.equal(true);
    // `support` is reserved. A retried run may already hold `support-acme`, so the next neighbour still counts.
    expect(reserved.emailAddress).to.match(/^support-acme(-\d+)?@agentinbox\.md$/);

    const other = await startSession();
    const collided = await createFromCli(other, { agentName: slug });
    expect(collided.emailHandleAdjusted).to.equal(true);
    expect(collided.emailAddress).to.equal(addressOf(`${slug}-acme`));
    await expectVanityInbox(other, `${slug}-acme`);
  });

  it('names the mailbox this deployment publishes when onboarding has not chosen a handle', async () => {
    const devDomain = 'dev.agentinbox.md';
    process.env.NOVU_AGENT_INBOX_INBOUND_DOMAIN = devDomain;

    try {
      const session = await startSession();
      const published = await readPublishedDomain(session);

      expect(published).to.deep.equal({ handle: '', available: false, domain: devDomain });
    } finally {
      process.env.NOVU_AGENT_INBOX_INBOUND_DOMAIN = INBOX_DOMAIN;
    }
  });

  it('stands in with the production domain when the shared inbox is turned off', async () => {
    process.env.IS_SELF_HOSTED = 'true';
    process.env.NOVU_AGENT_INBOX_INBOUND_DOMAIN = 'dev.agentinbox.md';

    try {
      const session = await startSession();
      const published = await readPublishedDomain(session);

      // Off means the production domain, even while a staging domain is still configured.
      expect(published).to.deep.equal({ handle: '', available: false, domain: 'agentinbox.md' });
    } finally {
      delete process.env.IS_SELF_HOSTED;
      process.env.NOVU_AGENT_INBOX_INBOUND_DOMAIN = INBOX_DOMAIN;
    }
  });
});

function freshHandle(): string {
  return `atlas${Math.random().toString(36).slice(2, 10)}`;
}

function addressOf(handle: string): string {
  return `${handle}@${INBOX_DOMAIN}`;
}

async function startSession(): Promise<UserSession> {
  const session = new UserSession();
  await session.initialize();

  return session;
}

/** The onboarding form: the operator, the name, and the handle on screen. */
function dashboardSetup(input: { agentName: string; inboxHandle: string }) {
  return {
    operator: true,
    firstName: 'Ada',
    lastName: 'Lovelace',
    agentName: input.agentName,
    email: OPERATOR_EMAIL,
    inboxHandle: input.inboxHandle,
  };
}

/**
 * `npx @agentinbox/cli setup --agent-name`: the operator's contact and the agent's name.
 * No handle — the API slugifies the name.
 */
function cliSetup(input: { agentName: string }) {
  return {
    operator: true,
    subscriberId: `operator_${Math.random().toString(36).slice(2, 10)}`,
    agentName: input.agentName,
    email: OPERATOR_EMAIL,
    firstName: 'Ada',
    lastName: 'Lovelace',
  };
}

function asDashboard(session: UserSession, method: 'get' | 'post', path: string) {
  return session.testAgent[method](path)
    .set('Authorization', `ApiKey ${session.apiKey}`)
    .set(AGENT_INBOX_DASHBOARD_SECRET_HEADER, DASHBOARD_SECRET);
}

function asCli(session: UserSession, method: 'get' | 'post', path: string) {
  return session.testAgent[method](path).set('Authorization', `ApiKey ${session.apiKey}`);
}

async function checkAddress(session: UserSession, handle: string) {
  const res = await asDashboard(session, 'get', '/v1/human/inbox-address').query({
    handle,
    email: OPERATOR_EMAIL,
  });
  expect(res.status).to.equal(200, JSON.stringify(res.body));

  return res.body.data as { handle: string; available: boolean; suggestion?: string; domain: string };
}

/** Onboarding reads the domain before the operator has typed a handle. */
async function readPublishedDomain(session: UserSession) {
  const res = await asDashboard(session, 'get', '/v1/human/inbox-address');
  expect(res.status).to.equal(200, JSON.stringify(res.body));

  return res.body.data as { handle: string; available: boolean; domain: string };
}

async function createFromDashboard(session: UserSession, input: { agentName: string; inboxHandle: string }) {
  const res = await asDashboard(session, 'post', '/v1/human/setup').send(dashboardSetup(input));
  expect(res.status).to.equal(200, JSON.stringify(res.body));

  return res.body.data as { agentName: string; emailAddress?: string; emailHandleAdjusted?: boolean };
}

async function createFromCli(session: UserSession, input: { agentName: string }) {
  const res = await asCli(session, 'post', '/v1/human/setup').send(cliSetup(input));
  expect(res.status).to.equal(200, JSON.stringify(res.body));

  return res.body.data as { agentName: string; emailAddress?: string; emailHandleAdjusted?: boolean };
}

async function expectVanityInbox(session: UserSession, handle: string) {
  const integration = await integrationRepository.findOne({
    _environmentId: session.environment._id,
    _organizationId: session.organization._id,
    providerId: EmailProviderIdEnum.AgentEmailInbox,
    channel: ChannelTypeEnum.EMAIL,
  });

  expect(integration?.credentials?.emailSlugPrefix).to.equal(handle);
  expect(integration?.credentials?.inboxDomain).to.equal(INBOX_DOMAIN);
  expect(integration?.credentials?.inboxRoutingKey).to.equal(undefined);
}

/**
 * Records what the test email would have sent. `NODE_ENV=test` already skips the provider;
 * this keeps the subject, the from address and the body so the test can read them.
 */
function captureOutboundMail(sent: IEmailOptions[]): () => void {
  const original = MailFactory.prototype.getHandler;
  sinon.stub(MailFactory.prototype, 'getHandler').callsFake(function (
    this: MailFactory,
    ...args: Parameters<MailFactory['getHandler']>
  ) {
    const handler = original.apply(this, args);
    sinon.stub(handler, 'send').callsFake(async (mail: IEmailOptions) => {
      sent.push(mail);

      return {};
    });

    return handler;
  });

  return () => {
    sinon.restore();
  };
}

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];

    return;
  }

  process.env[name] = value;
}
