import type { PinoLogger } from '@novu/application-generic';
import type { Agent } from '@novu/framework';
import { expect } from 'chai';
import sinon from 'sinon';
import { NovuAgentsBridgeService } from './novu-agents-bridge.service';

describe('NovuAgentsBridgeService', () => {
  const originalEnterprise = process.env.NOVU_ENTERPRISE;
  const originalCiEeTest = process.env.CI_EE_TEST;
  const agent = { id: 'novu-copilot' } as unknown as Agent;

  let registry: { buildAll: sinon.SinonStub };
  let moduleRef: { get: sinon.SinonStub };
  let logger: { error: sinon.SinonStub };
  let service: NovuAgentsBridgeService;

  beforeEach(() => {
    registry = { buildAll: sinon.stub().returns([agent]) };
    moduleRef = { get: sinon.stub().returns(registry) };
    logger = { error: sinon.stub() };
    service = new NovuAgentsBridgeService(moduleRef as never, logger as unknown as PinoLogger);
  });

  afterEach(() => {
    process.env.NOVU_ENTERPRISE = originalEnterprise;
    process.env.CI_EE_TEST = originalCiEeTest;
    if (originalEnterprise === undefined) delete process.env.NOVU_ENTERPRISE;
    if (originalCiEeTest === undefined) delete process.env.CI_EE_TEST;
  });

  it('serves no agents outside enterprise builds', () => {
    delete process.env.NOVU_ENTERPRISE;
    delete process.env.CI_EE_TEST;

    expect(service.getAgents()).to.deep.equal([]);
    expect(moduleRef.get.called).to.equal(false);
  });

  it('builds the agents from the @novu/ee-agents registry once and caches them', () => {
    process.env.NOVU_ENTERPRISE = 'true';

    expect(service.getAgents()).to.deep.equal([agent]);
    expect(service.getAgents()).to.deep.equal([agent]);
    expect(moduleRef.get.calledOnce).to.equal(true);
    expect(registry.buildAll.calledOnce).to.equal(true);
  });

  it('is fail-soft when the registry cannot be resolved', () => {
    process.env.NOVU_ENTERPRISE = 'true';
    moduleRef.get.throws(new Error('registry not found'));

    expect(service.getAgents()).to.deep.equal([]);
    expect(logger.error.calledOnce).to.equal(true);
  });
});
