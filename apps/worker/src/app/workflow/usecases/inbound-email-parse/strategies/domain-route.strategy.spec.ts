import { SendWebhookMessage } from '@novu/application-generic';
import { DomainRepository } from '@novu/dal';
import { DomainRouteTypeEnum, DomainStatusEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { InboundEmailParseCommand } from '../inbound-email-parse.command';
import { DomainRouteStrategy } from './domain-route.strategy';

const ENV_ID = 'env-001';
const ORG_ID = 'org-001';
const DOMAIN_NAME = 'example.com';

function makeVerifiedDomain(routes: Array<{ address: string; type: DomainRouteTypeEnum; destination?: string }>) {
  return {
    _id: 'domain-001',
    name: DOMAIN_NAME,
    status: DomainStatusEnum.VERIFIED,
    mxRecordConfigured: true,
    routes,
    _environmentId: ENV_ID,
    _organizationId: ORG_ID,
  };
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
  let sendWebhookMessage: sinon.SinonStubbedInstance<SendWebhookMessage>;
  let strategy: DomainRouteStrategy;
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    domainRepository = sandbox.createStubInstance(DomainRepository);
    sendWebhookMessage = sandbox.createStubInstance(SendWebhookMessage);
    strategy = new DomainRouteStrategy(domainRepository as any, sendWebhookMessage as any);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should NOT fire webhook when no WEBHOOK route exists', async () => {
    const domain = makeVerifiedDomain([
      { address: 'support', type: DomainRouteTypeEnum.AGENT, destination: 'agent-001' },
    ]);
    domainRepository.findByRouteAddress.resolves(domain as any);

    await strategy.execute(makeCommand('support'));

    sinon.assert.notCalled(sendWebhookMessage.execute);
  });

  it('should fire webhook when an exact WEBHOOK route matches', async () => {
    const domain = makeVerifiedDomain([{ address: 'support', type: DomainRouteTypeEnum.WEBHOOK }]);
    domainRepository.findByRouteAddress.resolves(domain as any);
    sendWebhookMessage.execute.resolves();

    await strategy.execute(makeCommand('support'));

    sinon.assert.calledOnce(sendWebhookMessage.execute);
    const call = sendWebhookMessage.execute.getCall(0);
    expect(call.args[0].payload.object).to.deep.include({ route: { address: 'support' } });
  });

  it('should NOT fire webhook for a WEBHOOK route that does not match the local-part', async () => {
    const domain = makeVerifiedDomain([{ address: 'billing', type: DomainRouteTypeEnum.WEBHOOK }]);
    domainRepository.findByRouteAddress.resolves(domain as any);

    await strategy.execute(makeCommand('support'));

    sinon.assert.notCalled(sendWebhookMessage.execute);
  });

  it('should fire webhook via wildcard "*" route when no exact match', async () => {
    const domain = makeVerifiedDomain([{ address: '*', type: DomainRouteTypeEnum.WEBHOOK }]);
    domainRepository.findByRouteAddress.resolves(domain as any);
    sendWebhookMessage.execute.resolves();

    await strategy.execute(makeCommand('anything'));

    sinon.assert.calledOnce(sendWebhookMessage.execute);
    const call = sendWebhookMessage.execute.getCall(0);
    expect(call.args[0].payload.object).to.deep.include({ route: { address: '*' } });
  });

  it('should prefer exact WEBHOOK route over wildcard "*"', async () => {
    const domain = makeVerifiedDomain([
      { address: '*', type: DomainRouteTypeEnum.WEBHOOK },
      { address: 'support', type: DomainRouteTypeEnum.WEBHOOK },
    ]);
    domainRepository.findByRouteAddress.resolves(domain as any);
    sendWebhookMessage.execute.resolves();

    await strategy.execute(makeCommand('support'));

    sinon.assert.calledOnce(sendWebhookMessage.execute);
    const call = sendWebhookMessage.execute.getCall(0);
    expect(call.args[0].payload.object).to.deep.include({ route: { address: 'support' } });
  });

  it('should fire both WEBHOOK and AGENT handlers when both routes match (fan-out)', async () => {
    const domain = makeVerifiedDomain([
      { address: 'support', type: DomainRouteTypeEnum.WEBHOOK },
      { address: 'support', type: DomainRouteTypeEnum.AGENT, destination: 'agent-001' },
    ]);
    domainRepository.findByRouteAddress.resolves(domain as any);
    sendWebhookMessage.execute.resolves();

    await strategy.execute(makeCommand('support'));

    sinon.assert.calledOnce(sendWebhookMessage.execute);
  });

  it('should throw when domain is not found', async () => {
    domainRepository.findByRouteAddress.resolves(null);

    try {
      await strategy.execute(makeCommand('support'));
      throw new Error('Expected error not thrown');
    } catch (e) {
      expect(e.message).to.include('No domain found');
    }
  });

  it('should throw when domain is not verified', async () => {
    const domain = { ...makeVerifiedDomain([]), status: DomainStatusEnum.PENDING };
    domainRepository.findByRouteAddress.resolves(domain as any);

    try {
      await strategy.execute(makeCommand('support'));
      throw new Error('Expected error not thrown');
    } catch (e) {
      expect(e.message).to.include('not verified');
    }
  });

  it('should throw when MX record is not configured', async () => {
    const domain = { ...makeVerifiedDomain([]), mxRecordConfigured: false };
    domainRepository.findByRouteAddress.resolves(domain as any);

    try {
      await strategy.execute(makeCommand('support'));
      throw new Error('Expected error not thrown');
    } catch (e) {
      expect(e.message).to.include('MX records');
    }
  });
});
