import { encryptCredentials } from '@novu/application-generic';
import { AgentIntegrationRepository, ChannelEndpointRepository, IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum, ENDPOINT_TYPES } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { AGENT_INBOX_DASHBOARD_SECRET_HEADER, DASHBOARD_ONLY } from '../guards/human-dashboard-secret.guard';

const integrationRepository = new IntegrationRepository();
const agentIntegrationRepository = new AgentIntegrationRepository();
const channelEndpointRepository = new ChannelEndpointRepository();

const DASHBOARD_SECRET = 'e2e-whatsapp-dashboard-secret';
const ENV_KEYS = [
  'AGENT_INBOX_DASHBOARD_API_SECRET',
  'IS_AGENT_INBOX_WHATSAPP_ENABLED',
  'IS_WHATSAPP_EMBEDDED_SIGNUP_ENABLED',
  'NOVU_WHATSAPP_APP_ID',
  'NOVU_WHATSAPP_APP_SECRET',
  'NOVU_WHATSAPP_CONFIG_ID',
] as const;

const SIGNUP = { code: 'meta-code', wabaId: 'waba-1', phoneNumberId: 'phone-1' };
const SENDING_CREDENTIALS = {
  apiToken: 'EAAG-e2e-secret-token',
  phoneNumberIdentification: 'phone-1',
  businessAccountId: 'waba-1',
  from: '+1 555-010-0199',
  isNovuManaged: true,
};
/** The link opens WhatsApp at the business number with the code typed in. */
const WA_ME_LINK = /^https:\/\/wa\.me\/15550100199\?text=Connect%20my%20WhatsApp%3A%20[B-Z]{4}-[B-Z]{4}$/;

/**
 * The operator's own WhatsApp Business account, connected from agentinbox.md with the Facebook button. Only
 * the operator's dashboard may read or change it, and while WhatsApp is turned off it isn't there at all.
 * Meta's code exchange is not reachable from here, so a real signup is not run.
 */
describe('Agent Inbox WhatsApp setup #novu-v2', () => {
  const original: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};
  let session: UserSession;
  let relayAgentId: string;
  let operatorId: string;

  beforeEach(async () => {
    for (const key of ENV_KEYS) {
      original[key] = process.env[key];
    }
    process.env.AGENT_INBOX_DASHBOARD_API_SECRET = DASHBOARD_SECRET;
    delete process.env.IS_AGENT_INBOX_WHATSAPP_ENABLED;

    session = new UserSession();
    await session.initialize();

    operatorId = `whatsapp-e2e-${Date.now()}`;
    const setupRes = await session.testAgent
      .post('/v1/human/setup')
      .send({ subscriberId: operatorId, operator: true, firstName: 'Ada' });
    expect(setupRes.status).to.equal(200, JSON.stringify(setupRes.body));
    relayAgentId = setupRes.body.data.agentId as string;
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (original[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original[key];
      }
    }
  });

  function turnWhatsAppOn() {
    process.env.IS_AGENT_INBOX_WHATSAPP_ENABLED = 'true';
    process.env.IS_WHATSAPP_EMBEDDED_SIGNUP_ENABLED = 'true';
    process.env.NOVU_WHATSAPP_APP_ID = 'e2e-app';
    process.env.NOVU_WHATSAPP_APP_SECRET = 'e2e-app-secret';
    process.env.NOVU_WHATSAPP_CONFIG_ID = 'e2e-config';
  }

  /** As a host calls: the account's key, without the dashboard's secret. */
  function asHost(method: 'get' | 'post', path: string) {
    return session.testAgent[method](path).set('Authorization', `ApiKey ${session.apiKey}`);
  }

  /** As the operator's dashboard calls: the same key, and the dashboard's secret. */
  function asDashboard(method: 'get' | 'post', path: string) {
    return asHost(method, path).set(AGENT_INBOX_DASHBOARD_SECRET_HEADER, DASHBOARD_SECRET);
  }

  async function linkWhatsApp(credentials: Record<string, unknown>) {
    const integration = await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      providerId: ChatProviderIdEnum.WhatsAppBusiness,
      channel: ChannelTypeEnum.CHAT,
      credentials: encryptCredentials(credentials as never),
      active: true,
      identifier: `whatsapp-e2e-${Date.now()}`,
      priority: 1,
      primary: false,
      deleted: false,
    });

    await agentIntegrationRepository.create({
      _agentId: relayAgentId,
      _integrationId: integration._id,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    return integration.identifier;
  }

  /** Stands in for the person sending the code from WhatsApp, which binds their number on the business number. */
  async function bindNumber(
    integrationIdentifier: string,
    subscriberId: string,
    phoneNumber: string,
    { proved = true } = {}
  ) {
    await channelEndpointRepository.create({
      identifier: `ce-whatsapp-e2e-${Date.now()}`,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      integrationIdentifier,
      providerId: ChatProviderIdEnum.WhatsAppBusiness,
      channel: ChannelTypeEnum.CHAT,
      subscriberId,
      contextKeys: [],
      type: ENDPOINT_TYPES.PHONE,
      endpoint: proved ? { phoneNumber, provedAt: new Date().toISOString() } : { phoneNumber },
    });
  }

  describe('only from the dashboard', () => {
    it('refuses a host that reads or connects WhatsApp', async () => {
      turnWhatsAppOn();

      for (const res of [
        await asHost('get', '/v1/human/agent/whatsapp'),
        await asHost('post', '/v1/human/agent/whatsapp/embedded-signup').send(SIGNUP),
        await asHost('post', '/v1/human/agent/whatsapp/link').send({}),
      ]) {
        expect(res.status).to.equal(403, JSON.stringify(res.body));
        expect(res.body.code).to.equal(DASHBOARD_ONLY);
      }
    });
  });

  describe('while WhatsApp is turned off', () => {
    it('reads as not there at all', async () => {
      const res = await asDashboard('get', '/v1/human/agent/whatsapp');

      expect(res.status).to.equal(200, JSON.stringify(res.body));
      expect(res.body.data).to.deep.equal({ enabled: false, available: false, connected: false });
    });

    it('refuses to connect, like an unknown channel', async () => {
      const res = await asDashboard('post', '/v1/human/agent/whatsapp/embedded-signup').send(SIGNUP);

      expect(res.status).to.equal(422, JSON.stringify(res.body));
    });

    it('hands out no code', async () => {
      const res = await asDashboard('post', '/v1/human/agent/whatsapp/link').send({});

      expect(res.status).to.equal(422, JSON.stringify(res.body));
    });
  });

  describe('while WhatsApp is turned on', () => {
    beforeEach(turnWhatsAppOn);

    it('hands the Facebook button its public Meta ids before anything is linked', async () => {
      const res = await asDashboard('get', '/v1/human/agent/whatsapp');

      expect(res.status).to.equal(200, JSON.stringify(res.body));
      expect(res.body.data).to.deep.equal({
        enabled: true,
        available: true,
        appId: 'e2e-app',
        configId: 'e2e-config',
        connected: false,
        businessConnected: false,
        operatorNumberBound: false,
      });
    });

    it('reads a linked business number as one step short, and never returns a credential', async () => {
      await linkWhatsApp(SENDING_CREDENTIALS);

      const res = await asDashboard('get', '/v1/human/agent/whatsapp');

      expect(res.status).to.equal(200, JSON.stringify(res.body));
      expect(res.body.data).to.include({
        connected: false,
        businessConnected: true,
        operatorNumberBound: false,
        displayPhoneNumber: '+1 555-010-0199',
      });
      expect(JSON.stringify(res.body)).to.not.contain('EAAG-e2e-secret-token');
      expect(JSON.stringify(res.body)).to.not.contain('e2e-app-secret');
    });

    it('hands the operator a wa.me link with a code for their own number', async () => {
      await linkWhatsApp(SENDING_CREDENTIALS);

      const res = await asDashboard('post', '/v1/human/agent/whatsapp/link').send({});

      expect(res.status).to.equal(200, JSON.stringify(res.body));
      expect(res.body.data.url).to.match(WA_ME_LINK);
      expect(res.body.data.code).to.match(/^[B-Z]{4}-[B-Z]{4}$/);
      expect(res.body.data.url).to.contain(res.body.data.code);
      expect(Date.parse(res.body.data.expiresAt)).to.be.greaterThan(Date.now());
    });

    it('asks to connect again when WhatsApp never said which number is linked', async () => {
      await linkWhatsApp({ ...SENDING_CREDENTIALS, from: undefined });

      const res = await asDashboard('post', '/v1/human/agent/whatsapp/link').send({});

      expect(res.status).to.equal(409, JSON.stringify(res.body));
      expect(res.body.code).to.equal('whatsapp_number_unknown');
    });

    it('reads WhatsApp as connected once the operator’s own number is bound', async () => {
      const identifier = await linkWhatsApp(SENDING_CREDENTIALS);
      await bindNumber(identifier, operatorId, '+15550100200');

      const res = await asDashboard('get', '/v1/human/agent/whatsapp');

      expect(res.status).to.equal(200, JSON.stringify(res.body));
      expect(res.body.data).to.include({
        connected: true,
        operatorNumberBound: true,
        operatorPhoneNumber: '+15550100200',
      });
    });

    it('does not count a number written through the channel-endpoints API, without a code', async () => {
      const identifier = await linkWhatsApp(SENDING_CREDENTIALS);
      const created = await asHost('post', '/v1/channel-endpoints').send({
        integrationIdentifier: identifier,
        subscriberId: operatorId,
        type: 'phone',
        endpoint: { phoneNumber: '+15550100300', provedAt: '2026-11-01T10:00:00.000Z' },
      });
      // The API takes a phone endpoint as exactly `{ phoneNumber }`, so the proof can't be written through it.
      expect(created.status).to.be.oneOf([400, 422], JSON.stringify(created.body));
      await bindNumber(identifier, operatorId, '+15550100300', { proved: false });

      const res = await asDashboard('get', '/v1/human/agent/whatsapp');

      expect(res.body.data).to.include({ connected: false, operatorNumberBound: false });
    });

    it('gives an invited contact a wa.me link, and reads them as connected once their number is bound', async () => {
      const identifier = await linkWhatsApp(SENDING_CREDENTIALS);
      const contactId = `whatsapp-invitee-${Date.now()}`;
      const invite = await session.testAgent.post('/v1/human/invites').send({ subscriberId: contactId });
      expect(invite.status).to.equal(201, JSON.stringify(invite.body));
      const token = (invite.body.data.url as string).split('/').pop();

      const connect = await session.testAgent.post('/v1/human/invites/connect').send({ token, via: 'whatsapp' });
      expect(connect.status).to.be.oneOf([200, 201], JSON.stringify(connect.body));
      expect(connect.body.data.url).to.match(WA_ME_LINK);

      await bindNumber(identifier, contactId, '+15550100201');
      const status = await session.testAgent.get(`/v1/human/invites/status?token=${token}`);
      const whatsApp = (status.body.data.channels as Array<{ via: string }>).find(({ via }) => via === 'whatsapp');
      expect(whatsApp).to.include({ connected: true, status: 'verified' });
    });

    it('needs a WhatsApp channel on the relay before connecting', async () => {
      const res = await asDashboard('post', '/v1/human/agent/whatsapp/embedded-signup').send(SIGNUP);

      expect(res.status).to.equal(404, JSON.stringify(res.body));
      expect(res.body.code).to.equal('channel_not_found');
    });

    it('takes any integration identifier, as integrations are created with', async () => {
      const res = await asDashboard('post', '/v1/human/agent/whatsapp/embedded-signup').send({
        ...SIGNUP,
        integrationIdentifier: 'whatsapp.main',
      });

      // Past validation: it is only missing from the relay.
      expect(res.status).to.equal(404, JSON.stringify(res.body));
      expect(res.body.code).to.equal('channel_not_found');
    });

    it('refuses a signup missing the code or the ids', async () => {
      const res = await asDashboard('post', '/v1/human/agent/whatsapp/embedded-signup').send({ code: 'meta-code' });

      expect(res.status).to.equal(422, JSON.stringify(res.body));
    });
  });
});
