import { encryptCredentials } from '@novu/application-generic';
import { AgentIntegrationRepository, IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { AGENT_INBOX_DASHBOARD_SECRET_HEADER, DASHBOARD_ONLY } from '../guards/human-dashboard-secret.guard';

const integrationRepository = new IntegrationRepository();
const agentIntegrationRepository = new AgentIntegrationRepository();

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

/**
 * The operator's own WhatsApp Business account, connected from agentinbox.md with the Facebook button. Only
 * the operator's dashboard may read or change it, and while WhatsApp is turned off it isn't there at all.
 * Meta's code exchange is not reachable from here, so a real signup is not run.
 */
describe('Agent Inbox WhatsApp setup #novu-v2', () => {
  const original: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};
  let session: UserSession;
  let relayAgentId: string;

  beforeEach(async () => {
    for (const key of ENV_KEYS) {
      original[key] = process.env[key];
    }
    process.env.AGENT_INBOX_DASHBOARD_API_SECRET = DASHBOARD_SECRET;
    delete process.env.IS_AGENT_INBOX_WHATSAPP_ENABLED;

    session = new UserSession();
    await session.initialize();

    const setupRes = await session.testAgent
      .post('/v1/human/setup')
      .send({ subscriberId: `whatsapp-e2e-${Date.now()}`, operator: true, firstName: 'Ada' });
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
  }

  describe('only from the dashboard', () => {
    it('refuses a host that reads or connects WhatsApp', async () => {
      turnWhatsAppOn();

      for (const res of [
        await asHost('get', '/v1/human/agent/whatsapp'),
        await asHost('post', '/v1/human/agent/whatsapp/embedded-signup').send(SIGNUP),
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
      });
    });

    it('reads a linked business number as connected, and never returns a credential', async () => {
      await linkWhatsApp({
        apiToken: 'EAAG-e2e-secret-token',
        phoneNumberIdentification: 'phone-1',
        businessAccountId: 'waba-1',
        from: '+1 555-010-0199',
        isNovuManaged: true,
      });

      const res = await asDashboard('get', '/v1/human/agent/whatsapp');

      expect(res.status).to.equal(200, JSON.stringify(res.body));
      expect(res.body.data).to.include({ connected: true, displayPhoneNumber: '+1 555-010-0199' });
      expect(JSON.stringify(res.body)).to.not.contain('EAAG-e2e-secret-token');
      expect(JSON.stringify(res.body)).to.not.contain('e2e-app-secret');
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
