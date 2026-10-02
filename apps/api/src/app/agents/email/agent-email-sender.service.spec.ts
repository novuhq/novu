import { MailFactory } from '@novu/application-generic';
import { createNovuEmailAdapter } from '@novu/chat-adapter-email';
import type { IntegrationEntity } from '@novu/dal';
import { ChannelTypeEnum, EmailProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import type { ResolvedAgentConfig } from '../channels/agent-config-resolver.service';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';
import { AgentEmailSender, resolveAgentEmailSenderName } from './agent-email-sender.service';

const SHARED_DOMAIN = 'agentconnect.sh';
const OUTBOUND_INTEGRATION_ID = 'outbound-integration-id';
const SIGNING_SECRET = 'email-webhook-secret';

function makeConfig(credentials: ResolvedAgentConfig['credentials'] = {}): ResolvedAgentConfig {
  return {
    platform: AgentPlatformEnum.EMAIL,
    agentId: 'agent-id',
    agentName: 'Human Relay',
    environmentId: 'env-id',
    organizationId: 'org-id',
    credentials: {
      emailSlugPrefix: 'human-relay',
      inboxRoutingKey: 'abc12345',
      ...credentials,
    },
  } as unknown as ResolvedAgentConfig;
}

function makeSendGridIntegration(overrides: Partial<IntegrationEntity> = {}): IntegrationEntity {
  return {
    _id: OUTBOUND_INTEGRATION_ID,
    _environmentId: 'env-id',
    _organizationId: 'org-id',
    channel: ChannelTypeEnum.EMAIL,
    providerId: EmailProviderIdEnum.SendGrid,
    active: true,
    credentials: { apiKey: 'sg-api-key', from: 'noreply@customer.example' },
    ...overrides,
  } as IntegrationEntity;
}

describe('AgentEmailSender', () => {
  const savedEnv = {
    NOVU_ENTERPRISE: process.env.NOVU_ENTERPRISE,
    IS_SELF_HOSTED: process.env.IS_SELF_HOSTED,
    NOVU_AGENT_SHARED_INBOUND_DOMAIN: process.env.NOVU_AGENT_SHARED_INBOUND_DOMAIN,
  };

  let integrationRepository: { findOne: sinon.SinonStub };
  let handlerSend: sinon.SinonStub;
  let getHandler: sinon.SinonStub;

  function buildSender(): AgentEmailSender {
    const logger = { setContext: sinon.stub(), warn: sinon.stub(), error: sinon.stub(), info: sinon.stub() };

    return new AgentEmailSender(
      logger as never,
      integrationRepository as never,
      { execute: sinon.stub().resolves(null) } as never,
      { create: sinon.stub().resolves() } as never
    );
  }

  beforeEach(() => {
    process.env.NOVU_ENTERPRISE = 'true';
    delete process.env.IS_SELF_HOSTED;
    process.env.NOVU_AGENT_SHARED_INBOUND_DOMAIN = SHARED_DOMAIN;

    integrationRepository = { findOne: sinon.stub().resolves(makeSendGridIntegration()) };
    handlerSend = sinon.stub().resolves({ id: 'provider-message-id' });
    getHandler = sinon.stub(MailFactory.prototype, 'getHandler').returns({ send: handlerSend } as never);
  });

  afterEach(() => {
    sinon.restore();

    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  describe('resolveSharedInboxAddress', () => {
    it('builds {slug}-{routingKey}@<shared-domain> when the shared inbox is available', () => {
      const address = buildSender().resolveSharedInboxAddress(makeConfig());

      expect(address).to.equal(`human-relay-abc12345@${SHARED_DOMAIN}`);
    });

    it('returns undefined when the agent opted out of the shared inbox', () => {
      const address = buildSender().resolveSharedInboxAddress(makeConfig({ sharedInboxDisabled: true }));

      expect(address).to.equal(undefined);
    });

    it('returns undefined when the agent has no slug or routing key', () => {
      const sender = buildSender();

      expect(sender.resolveSharedInboxAddress(makeConfig({ emailSlugPrefix: undefined }))).to.equal(undefined);
      expect(sender.resolveSharedInboxAddress(makeConfig({ inboxRoutingKey: undefined }))).to.equal(undefined);
    });

    it('returns undefined on self-hosted deployments where the shared inbox is unavailable', () => {
      process.env.IS_SELF_HOSTED = 'true';

      const address = buildSender().resolveSharedInboxAddress(makeConfig());

      expect(address).to.equal(undefined);
    });

    it('returns undefined instead of throwing when the routing key is malformed', () => {
      const address = buildSender().resolveSharedInboxAddress(makeConfig({ inboxRoutingKey: 'NOT-VALID' }));

      expect(address).to.equal(undefined);
    });
  });

  describe('agent-opened thread through the registry wiring (openDM → postMessage → provider)', () => {
    function createRegistryWiredAdapter(config: ResolvedAgentConfig) {
      const sender = buildSender();
      const stored = new Map<string, unknown>();
      const state = {
        get: sinon.stub().callsFake(async (key: string) => stored.get(key) ?? null),
        set: sinon.stub().callsFake(async (key: string, value: unknown) => {
          stored.set(key, value);
        }),
        getList: sinon.stub().resolves([]),
        appendToList: sinon.stub().resolves(),
        setIfNotExists: sinon.stub().resolves(),
      };

      // Mirrors ChatInstanceRegistry.createChatInstance for the email platform.
      const adapter = createNovuEmailAdapter({
        senderName: resolveAgentEmailSenderName(config),
        signingSecret: SIGNING_SECRET,
        defaultAgentAddress: sender.resolveSharedInboxAddress(config),
        sendEmail: sender.buildSendEmailCallback(config, OUTBOUND_INTEGRATION_ID),
        stripAgentReplyToken: (address) => address,
      });

      return { adapter, state };
    }

    it('delivers the first message from the shared inbox through the outbound provider', async () => {
      const config = makeConfig();
      const { adapter, state } = createRegistryWiredAdapter(config);
      await adapter.initialize({ getState: () => state, processMessage: sinon.stub() } as never);

      const threadId = await adapter.openDM!('person@example.com');
      const sent = await adapter.postMessage(threadId, { markdown: 'Deploy to production?' });

      const sharedInbox = `human-relay-abc12345@${SHARED_DOMAIN}`;
      expect(integrationRepository.findOne.calledOnce).to.equal(true);
      expect(getHandler.calledOnce).to.equal(true);
      expect(getHandler.firstCall.args[1]).to.equal(sharedInbox);

      expect(handlerSend.calledOnce).to.equal(true);
      const mailOptions = handlerSend.firstCall.args[0];
      expect(mailOptions.from).to.equal(sharedInbox);
      expect(mailOptions.replyTo).to.equal(undefined);
      expect(mailOptions.to).to.deep.equal(['person@example.com']);
      expect(mailOptions.senderName).to.equal('Human Relay');
      expect(mailOptions.headers['Message-ID']).to.match(/^<.+>$/);

      expect(sent.raw.from).to.equal(`Human Relay <${sharedInbox}>`);
      expect(sent.raw.messageId).to.equal('provider-message-id');
    });

    it('fails before reaching the provider when the deployment has no shared inbox', async () => {
      process.env.IS_SELF_HOSTED = 'true';
      const { adapter, state } = createRegistryWiredAdapter(makeConfig());
      await adapter.initialize({ getState: () => state, processMessage: sinon.stub() } as never);

      const threadId = await adapter.openDM!('person@example.com');

      let error: unknown;
      try {
        await adapter.postMessage(threadId, { markdown: 'Deploy to production?' });
      } catch (err) {
        error = err;
      }

      expect((error as Error).message).to.match(/No agent address found for thread/);
      expect(integrationRepository.findOne.called).to.equal(false);
      expect(handlerSend.called).to.equal(false);
    });

    it('rejects an inactive outbound integration before sending', async () => {
      integrationRepository.findOne.resolves(makeSendGridIntegration({ active: false }));
      const { adapter, state } = createRegistryWiredAdapter(makeConfig());
      await adapter.initialize({ getState: () => state, processMessage: sinon.stub() } as never);

      const threadId = await adapter.openDM!('person@example.com');

      let error: unknown;
      try {
        await adapter.postMessage(threadId, { markdown: 'Deploy to production?' });
      } catch (err) {
        error = err;
      }

      expect((error as Error).message).to.match(/is inactive/);
      expect(handlerSend.called).to.equal(false);
    });
  });
});
