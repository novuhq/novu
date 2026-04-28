import { InboundDomainRouteDelivery } from '@novu/application-generic';
import { DomainRepository, DomainRouteRepository } from '@novu/dal';
import { DomainRouteTypeEnum, DomainStatusEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { InboundEmailParseCommand } from '../inbound-email-parse.command';
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
  let strategy: DomainRouteStrategy;
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    domainRepository = sandbox.createStubInstance(DomainRepository);
    domainRouteRepository = sandbox.createStubInstance(DomainRouteRepository);
    inboundDomainRouteDelivery = sandbox.createStubInstance(InboundDomainRouteDelivery);

    inboundDomainRouteDelivery.deliverToAgent.resolves({ httpStatus: 200, body: {}, latencyMs: 1 });
    inboundDomainRouteDelivery.deliverToWebhook.resolves({ latencyMs: 1, skipped: false });

    strategy = new DomainRouteStrategy(
      domainRepository as any,
      domainRouteRepository as any,
      inboundDomainRouteDelivery as any
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
});
