import { InboundDomainRouteDelivery, PinoLogger } from '@novu/application-generic';
import {
  AgentIntegrationRepository,
  AgentRepository,
  DomainRepository,
  DomainRouteRepository,
  IntegrationRepository,
} from '@novu/dal';
import { DomainRouteTypeEnum, DomainStatusEnum, EmailProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { InboundEmailParseCommand } from '../inbound-email-parse.command';
import { InboundParseProcessingError } from '../inbound-parse-outcome';
import { DomainRouteStrategy } from './domain-route.strategy';

const ENV_ID = 'env-001';
const ORG_ID = 'org-001';
const DOMAIN_NAME = 'example.com';

function makeVerifiedDomain() {
  return {
    _id: 'domain-001',
    name: DOMAIN_NAME,
    status: DomainStatusEnum.VERIFIED,
    mxRecordConfigured: true,
    _environmentId: ENV_ID,
    _organizationId: ORG_ID,
  };
}

function makeRoutes(routes: Array<{ address: string; type: DomainRouteTypeEnum; destination?: string }>) {
  return routes.map((route, index) => ({
    _id: `route-${index}`,
    _domainId: 'domain-001',
    _environmentId: ENV_ID,
    _organizationId: ORG_ID,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...route,
  }));
}

function makeCommand(localPart: string): InboundEmailParseCommand {
  return {
    to: [{ address: `${localPart}@${DOMAIN_NAME}`, name: '' }],
    from: [{ address: 'sender@other.com', name: '' }],
    subject: 'Hello',
    html: '<p>Hi</p>',
    text: 'Hi',
    headers: {},
    messageId: 'msg-001',
    inReplyTo: undefined,
    references: undefined,
    date: new Date(),
    cc: [],
    attachments: [],
    priority: 'normal',
    dkim: 'pass',
    spf: 'pass',
    spamScore: 0,
    language: 'english',
    connection: {} as any,
    envelopeFrom: { address: 'sender@other.com', args: false },
    envelopeTo: [{ address: `${localPart}@${DOMAIN_NAME}`, args: false }],
  } as unknown as InboundEmailParseCommand;
}

describe('DomainRouteStrategy', () => {
  let domainRepository: sinon.SinonStubbedInstance<DomainRepository>;
  let domainRouteRepository: sinon.SinonStubbedInstance<DomainRouteRepository>;
  let inboundDomainRouteDelivery: sinon.SinonStubbedInstance<InboundDomainRouteDelivery>;
  let agentRepository: sinon.SinonStubbedInstance<AgentRepository>;
  let integrationRepository: sinon.SinonStubbedInstance<IntegrationRepository>;
  let agentIntegrationRepository: sinon.SinonStubbedInstance<AgentIntegrationRepository>;
  let logger: sinon.SinonStubbedInstance<PinoLogger>;
  let strategy: DomainRouteStrategy;
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    domainRepository = sandbox.createStubInstance(DomainRepository);
    domainRouteRepository = sandbox.createStubInstance(DomainRouteRepository);
    inboundDomainRouteDelivery = sandbox.createStubInstance(InboundDomainRouteDelivery);
    agentRepository = sandbox.createStubInstance(AgentRepository);
    integrationRepository = sandbox.createStubInstance(IntegrationRepository);
    agentIntegrationRepository = sandbox.createStubInstance(AgentIntegrationRepository);
    logger = sandbox.createStubInstance(PinoLogger);

    inboundDomainRouteDelivery.deliverToAgent.resolves({ httpStatus: 200, body: {}, latencyMs: 1 });
    inboundDomainRouteDelivery.deliverToWebhook.resolves({ latencyMs: 1, skipped: false });

    strategy = new DomainRouteStrategy(
      domainRepository as any,
      domainRouteRepository as any,
      inboundDomainRouteDelivery as any,
      agentRepository as any,
      integrationRepository as any,
      agentIntegrationRepository as any,
      logger as any
    );
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should dispatch the agent route when the matching route is type=agent', async () => {
    const routes = makeRoutes([{ address: 'support', type: DomainRouteTypeEnum.AGENT, destination: 'agent-001' }]);
    domainRepository.findByName.resolves(makeVerifiedDomain() as any);
    domainRouteRepository.findByDomainAndAddresses.resolves(routes as any);

    await strategy.execute(makeCommand('support'));

    sinon.assert.notCalled(inboundDomainRouteDelivery.deliverToWebhook as any);
    sinon.assert.calledOnce(inboundDomainRouteDelivery.deliverToAgent);
  });

  it('should sanitize downstream 5xx delivery failures for customer traces', async () => {
    const routes = makeRoutes([{ address: 'support', type: DomainRouteTypeEnum.AGENT, destination: 'agent-001' }]);
    domainRepository.findByName.resolves(makeVerifiedDomain() as any);
    domainRouteRepository.findByDomainAndAddresses.resolves(routes as any);
    inboundDomainRouteDelivery.deliverToAgent.rejects(
      Object.assign(new Error('Response code 500 (Internal Server Error)'), {
        statusCode: 500,
        responseBody: { message: 'Internal server error' },
      })
    );

    try {
      await strategy.execute(makeCommand('support'));
      throw new Error('Expected InboundParseProcessingError');
    } catch (error) {
      expect(error).to.be.instanceOf(Error);
      expect((error as Error).message).to.equal('Response code 500 (Internal Server Error)');
      const processingError = error as InboundParseProcessingError;
      expect(processingError.outcome?.status).to.equal(502);
      expect(processingError.outcome?.message).to.equal('Inbound delivery failed due to a temporary internal error');
    }

    sinon.assert.calledOnce(logger.error as any);
  });

  it('should fire webhook when an exact WEBHOOK route matches', async () => {
    const routes = makeRoutes([{ address: 'support', type: DomainRouteTypeEnum.WEBHOOK }]);
    domainRepository.findByName.resolves(makeVerifiedDomain() as any);
    domainRouteRepository.findByDomainAndAddresses.resolves(routes as any);

    await strategy.execute(makeCommand('support'));

    sinon.assert.calledOnce(inboundDomainRouteDelivery.deliverToWebhook);
    const call = inboundDomainRouteDelivery.deliverToWebhook.getCall(0);
    expect(call.args[0].mail.subject).to.equal('Hello');
    expect(call.args[0].route.address).to.equal('support');
  });

  it('should pass slim IInboundParseAttachment (no binary content) through commandToMail to the delivery layer', async () => {
    const routes = makeRoutes([{ address: 'support', type: DomainRouteTypeEnum.WEBHOOK }]);
    domainRepository.findByName.resolves(makeVerifiedDomain() as any);
    domainRouteRepository.findByDomainAndAddresses.resolves(routes as any);

    const slimAttachment = {
      filename: 'doc.pdf',
      contentType: 'application/pdf',
      size: 2048,
      url: 'https://s3.example.com/inbound-mail/2024-01-01/msg/uuid-doc.pdf?sig=xyz',
      storagePath: 'inbound-mail/2024-01-01/msg/uuid-doc.pdf',
    };
    const command = makeCommand('support');
    (command as any).attachments = [slimAttachment];

    await strategy.execute(command);

    sinon.assert.calledOnce(inboundDomainRouteDelivery.deliverToWebhook);
    const call = inboundDomainRouteDelivery.deliverToWebhook.getCall(0);
    const passedAttachments = call.args[0].mail.attachments as unknown as Array<Record<string, unknown>>;

    // The slim queue shape is forwarded — no `content` binary blob here.
    // Rehydration happens inside InboundDomainRouteDelivery (tested separately).
    expect(passedAttachments).to.have.length(1);
    expect(passedAttachments[0]['filename']).to.equal('doc.pdf');
    expect(passedAttachments[0]['size']).to.equal(2048);
    expect(String(passedAttachments[0]['url'])).to.include('s3.example.com');
    expect(passedAttachments[0]['content']).to.be.undefined;
  });

  it('should NOT fire webhook for a WEBHOOK route that does not match the local-part', async () => {
    const routes = makeRoutes([{ address: 'billing', type: DomainRouteTypeEnum.WEBHOOK }]);
    domainRepository.findByName.resolves(makeVerifiedDomain() as any);
    domainRouteRepository.findByDomainAndAddresses.resolves(routes as any);

    await strategy.execute(makeCommand('support'));

    sinon.assert.notCalled(inboundDomainRouteDelivery.deliverToWebhook);
  });

  it('should fire webhook via wildcard "*" route when no exact match', async () => {
    const routes = makeRoutes([{ address: '*', type: DomainRouteTypeEnum.WEBHOOK }]);
    domainRepository.findByName.resolves(makeVerifiedDomain() as any);
    domainRouteRepository.findByDomainAndAddresses.resolves(routes as any);

    await strategy.execute(makeCommand('anything'));

    sinon.assert.calledOnce(inboundDomainRouteDelivery.deliverToWebhook);
    const call = inboundDomainRouteDelivery.deliverToWebhook.getCall(0);
    expect(call.args[0].route.address).to.equal('*');
  });

  it('should prefer exact WEBHOOK route over wildcard "*"', async () => {
    const routes = makeRoutes([
      { address: '*', type: DomainRouteTypeEnum.WEBHOOK },
      { address: 'support', type: DomainRouteTypeEnum.WEBHOOK },
    ]);
    domainRepository.findByName.resolves(makeVerifiedDomain() as any);
    domainRouteRepository.findByDomainAndAddresses.resolves(routes as any);

    await strategy.execute(makeCommand('support'));

    sinon.assert.calledOnce(inboundDomainRouteDelivery.deliverToWebhook);
    const call = inboundDomainRouteDelivery.deliverToWebhook.getCall(0);
    expect(call.args[0].route.address).to.equal('support');
  });

  it('should not fire any handler when no route matches', async () => {
    domainRepository.findByName.resolves(makeVerifiedDomain() as any);
    domainRouteRepository.findByDomainAndAddresses.resolves([]);

    await strategy.execute(makeCommand('support'));

    sinon.assert.notCalled(inboundDomainRouteDelivery.deliverToWebhook);
    sinon.assert.notCalled(inboundDomainRouteDelivery.deliverToAgent);
  });

  it('should throw when domain is not found', async () => {
    domainRepository.findByName.resolves(null);

    try {
      await strategy.execute(makeCommand('support'));
      throw new Error('Expected error not thrown');
    } catch (e) {
      expect((e as Error).message).to.include('No domain found');
    }
  });

  it('should throw when domain is not verified', async () => {
    const domain = { ...makeVerifiedDomain(), status: DomainStatusEnum.PENDING };
    domainRepository.findByName.resolves(domain as any);

    try {
      await strategy.execute(makeCommand('support'));
      throw new Error('Expected error not thrown');
    } catch (e) {
      expect((e as Error).message).to.include('not verified');
    }
  });

  it('should throw when MX record is not configured', async () => {
    const domain = { ...makeVerifiedDomain(), mxRecordConfigured: false };
    domainRepository.findByName.resolves(domain as any);

    try {
      await strategy.execute(makeCommand('support'));
      throw new Error('Expected error not thrown');
    } catch (e) {
      expect((e as Error).message).to.include('MX records');
    }
  });

  describe('shared agent domain branch', () => {
    const SHARED_DOMAIN = 'agentconnect.sh';
    const AGENT_ID = '65a3f1d2b8e4c7a9f3b2c1d0';
    const INTEGRATION_ID = '65a3f1d2b8e4c7a9f3b2c1ff';
    const ROUTING_KEY = 'a1b2c3d4';

    function makeSharedCommand(localPart: string): InboundEmailParseCommand {
      return {
        ...makeCommand('ignored'),
        to: [{ address: `${localPart}@${SHARED_DOMAIN}`, name: '' }],
      } as InboundEmailParseCommand;
    }

    function makeAgent() {
      return {
        _id: AGENT_ID,
        name: 'Wine Bot',
        identifier: 'wine-bot',
        active: true,
        _environmentId: ENV_ID,
        _organizationId: ORG_ID,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };
    }

    function makeIntegration() {
      return {
        _id: INTEGRATION_ID,
        providerId: EmailProviderIdEnum.NovuAgent,
        active: true,
        _environmentId: ENV_ID,
        _organizationId: ORG_ID,
        credentials: {
          inboxRoutingKey: ROUTING_KEY,
          emailSlugPrefix: 'wine-bot',
        } as { inboxRoutingKey: string; emailSlugPrefix: string; sharedInboxDisabled?: boolean },
      };
    }

    function makeLink() {
      return { _agentId: AGENT_ID };
    }

    const sharedEnvKey = 'NOVU_AGENT_SHARED_INBOUND_DOMAIN';
    const enterpriseKey = 'NOVU_ENTERPRISE';
    const selfHostedKey = 'IS_SELF_HOSTED';
    const apiRootKey = 'API_ROOT_URL';
    let prevShared: string | undefined;
    let prevEnterprise: string | undefined;
    let prevSelfHosted: string | undefined;
    let prevApiRoot: string | undefined;

    beforeEach(() => {
      prevShared = process.env[sharedEnvKey];
      prevEnterprise = process.env[enterpriseKey];
      prevSelfHosted = process.env[selfHostedKey];
      prevApiRoot = process.env[apiRootKey];
      process.env[sharedEnvKey] = SHARED_DOMAIN;
      process.env[enterpriseKey] = 'true';
      process.env[selfHostedKey] = 'false';
      process.env[apiRootKey] = 'http://localhost:3000';
    });

    afterEach(() => {
      if (prevShared === undefined) delete process.env[sharedEnvKey];
      else process.env[sharedEnvKey] = prevShared;
      if (prevEnterprise === undefined) delete process.env[enterpriseKey];
      else process.env[enterpriseKey] = prevEnterprise;
      if (prevSelfHosted === undefined) delete process.env[selfHostedKey];
      else process.env[selfHostedKey] = prevSelfHosted;
      if (prevApiRoot === undefined) delete process.env[apiRootKey];
      else process.env[apiRootKey] = prevApiRoot;
    });

    it('parses {slug}-{inboxRoutingKey} and delegates to deliverToAgent', async () => {
      integrationRepository.findAgentInboundByInboxRoutingKey.resolves(makeIntegration() as any);
      agentIntegrationRepository.findOne.resolves(makeLink() as any);
      agentRepository.findByIdForWebhook.resolves(makeAgent() as any);

      await strategy.execute(makeSharedCommand(`wine-bot-${ROUTING_KEY}`));

      sinon.assert.calledOnce(inboundDomainRouteDelivery.deliverToAgent);
      const call = inboundDomainRouteDelivery.deliverToAgent.getCall(0);
      expect(call.args[0].route.destination).to.equal(AGENT_ID);
      expect(call.args[0].domain.name).to.equal(SHARED_DOMAIN);
      sinon.assert.calledOnceWithExactly(integrationRepository.findAgentInboundByInboxRoutingKey as any, ROUTING_KEY);
      sinon.assert.notCalled(domainRepository.findByName as any);
    });

    it('drops mail when local-part has no recognizable routing key', async () => {
      await strategy.execute(makeSharedCommand('garbage-localpart'));

      sinon.assert.notCalled(inboundDomainRouteDelivery.deliverToAgent);
      sinon.assert.notCalled(integrationRepository.findAgentInboundByInboxRoutingKey as any);
      sinon.assert.notCalled(agentRepository.findByIdForWebhook as any);
    });

    it('drops mail when no integration exists for the routing key', async () => {
      integrationRepository.findAgentInboundByInboxRoutingKey.resolves(null);

      await strategy.execute(makeSharedCommand(`wine-bot-${ROUTING_KEY}`));

      sinon.assert.notCalled(inboundDomainRouteDelivery.deliverToAgent);
      sinon.assert.notCalled(agentIntegrationRepository.findOne as any);
      sinon.assert.notCalled(agentRepository.findByIdForWebhook as any);
    });

    it('drops mail when the integration is inactive', async () => {
      integrationRepository.findAgentInboundByInboxRoutingKey.resolves({ ...makeIntegration(), active: false } as any);

      await strategy.execute(makeSharedCommand(`wine-bot-${ROUTING_KEY}`));

      sinon.assert.notCalled(inboundDomainRouteDelivery.deliverToAgent);
      sinon.assert.notCalled(agentIntegrationRepository.findOne as any);
    });

    it('drops mail when the shared inbox is disabled on the integration', async () => {
      const integration = makeIntegration();
      integration.credentials = { ...integration.credentials, sharedInboxDisabled: true };
      integrationRepository.findAgentInboundByInboxRoutingKey.resolves(integration as any);

      await strategy.execute(makeSharedCommand(`wine-bot-${ROUTING_KEY}`));

      sinon.assert.notCalled(inboundDomainRouteDelivery.deliverToAgent);
      sinon.assert.notCalled(agentIntegrationRepository.findOne as any);
      sinon.assert.notCalled(agentRepository.findByIdForWebhook as any);
    });

    it('drops mail when no agent link exists for the integration', async () => {
      integrationRepository.findAgentInboundByInboxRoutingKey.resolves(makeIntegration() as any);
      agentIntegrationRepository.findOne.resolves(null);

      await strategy.execute(makeSharedCommand(`wine-bot-${ROUTING_KEY}`));

      sinon.assert.notCalled(inboundDomainRouteDelivery.deliverToAgent);
      sinon.assert.notCalled(agentRepository.findByIdForWebhook as any);
    });

    it('drops mail when no agent exists for the link', async () => {
      integrationRepository.findAgentInboundByInboxRoutingKey.resolves(makeIntegration() as any);
      agentIntegrationRepository.findOne.resolves(makeLink() as any);
      agentRepository.findByIdForWebhook.resolves(null);

      await strategy.execute(makeSharedCommand(`wine-bot-${ROUTING_KEY}`));

      sinon.assert.notCalled(inboundDomainRouteDelivery.deliverToAgent);
    });

    it('drops mail when agent.active is false', async () => {
      integrationRepository.findAgentInboundByInboxRoutingKey.resolves(makeIntegration() as any);
      agentIntegrationRepository.findOne.resolves(makeLink() as any);
      agentRepository.findByIdForWebhook.resolves({ ...makeAgent(), active: false } as any);

      await strategy.execute(makeSharedCommand(`wine-bot-${ROUTING_KEY}`));

      sinon.assert.notCalled(inboundDomainRouteDelivery.deliverToAgent);
    });

    it('falls through to the legacy Domain lookup when not cloud', async () => {
      process.env[enterpriseKey] = 'false';
      domainRepository.findByName.resolves(null);

      try {
        await strategy.execute(makeSharedCommand(`wine-bot-${ROUTING_KEY}`));
      } catch {
        // Expected throw - legacy path can't find domain
      }

      sinon.assert.notCalled(integrationRepository.findAgentInboundByInboxRoutingKey as any);
      sinon.assert.notCalled(agentRepository.findByIdForWebhook as any);
      sinon.assert.calledOnce(domainRepository.findByName as any);
    });
  });
});
