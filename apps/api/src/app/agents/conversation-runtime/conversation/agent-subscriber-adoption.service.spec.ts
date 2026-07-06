import { expect } from 'chai';
import sinon from 'sinon';
import { AgentSubscriberAdoptionService } from './agent-subscriber-adoption.service';
import { AGENT_PLATFORM_PROVISION_SOURCE, AGENT_PROVISION_DATA_KEYS } from './agent-subscriber-provision.constants';

describe('AgentSubscriberAdoptionService', () => {
  function makeService(
    overrides: {
      repointParticipant?: sinon.SinonStub;
      repointSender?: sinon.SinonStub;
      repointMcp?: sinon.SinonStub;
      repointTrust?: sinon.SinonStub;
      subscriberDelete?: sinon.SinonStub;
      track?: sinon.SinonStub;
    } = {}
  ) {
    const conversationRepository = {
      repointSubscriberParticipant: overrides.repointParticipant ?? sinon.stub().resolves(2),
    };
    const conversationActivityRepository = {
      repointSubscriberSender: overrides.repointSender ?? sinon.stub().resolves(5),
    };
    const mcpConnectionRepository = {
      repointSubscriberConnections: overrides.repointMcp ?? sinon.stub().resolves({ moved: 1, dropped: 0 }),
    };
    const agentToolTrustRepository = {
      repointSubscriber: overrides.repointTrust ?? sinon.stub().resolves({ moved: 1, dropped: 0 }),
    };
    const subscriberRepository = {
      delete: overrides.subscriberDelete ?? sinon.stub().resolves(undefined),
    };
    const analyticsService = { track: overrides.track ?? sinon.stub() };
    const logger = {
      setContext: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub(),
      info: sinon.stub(),
    };

    const service = new AgentSubscriberAdoptionService(
      conversationRepository as any,
      conversationActivityRepository as any,
      mcpConnectionRepository as any,
      agentToolTrustRepository as any,
      subscriberRepository as any,
      analyticsService as any,
      logger as any
    );

    return {
      service,
      conversationRepository,
      conversationActivityRepository,
      mcpConnectionRepository,
      agentToolTrustRepository,
      subscriberRepository,
      analyticsService,
      logger,
    };
  }

  const real = { _id: 'mongo-real', subscriberId: 'sub-real' };
  const phantom = { _id: 'mongo-phantom', subscriberId: 'sub-phantom' };
  const baseParams = { environmentId: 'env-1', organizationId: 'org-1' };

  it('repoints all four record types then deletes the phantom, guarded by provenance', async () => {
    const {
      service,
      conversationRepository,
      conversationActivityRepository,
      mcpConnectionRepository,
      agentToolTrustRepository,
      subscriberRepository,
    } = makeService();

    await service.adoptPhantomsInto({ ...baseParams, real, phantoms: [phantom] });

    expect(
      conversationRepository.repointSubscriberParticipant.calledOnceWith('env-1', 'org-1', 'sub-phantom', 'sub-real')
    ).to.equal(true);
    expect(
      conversationActivityRepository.repointSubscriberSender.calledOnceWith('env-1', 'org-1', 'sub-phantom', 'sub-real')
    ).to.equal(true);
    expect(mcpConnectionRepository.repointSubscriberConnections.calledOnce).to.equal(true);
    expect(mcpConnectionRepository.repointSubscriberConnections.firstCall.args[0]).to.include({
      fromSubscriberId: 'mongo-phantom',
      toSubscriberId: 'mongo-real',
    });
    expect(agentToolTrustRepository.repointSubscriber.calledOnce).to.equal(true);
    expect(agentToolTrustRepository.repointSubscriber.firstCall.args[0]).to.include({
      fromSubscriberId: 'mongo-phantom',
      toSubscriberId: 'mongo-real',
    });

    expect(subscriberRepository.delete.calledOnce).to.equal(true);
    const deleteFilter = subscriberRepository.delete.firstCall.args[0];
    expect(deleteFilter.subscriberId).to.equal('sub-phantom');
    expect(deleteFilter[`data.${AGENT_PROVISION_DATA_KEYS.source}`]).to.equal(AGENT_PLATFORM_PROVISION_SOURCE);
  });

  it('deletes the phantom only after every repoint has run', async () => {
    const { service, conversationRepository, agentToolTrustRepository, subscriberRepository } = makeService();

    await service.adoptPhantomsInto({ ...baseParams, real, phantoms: [phantom] });

    expect(subscriberRepository.delete.calledAfter(conversationRepository.repointSubscriberParticipant)).to.equal(true);
    expect(subscriberRepository.delete.calledAfter(agentToolTrustRepository.repointSubscriber)).to.equal(true);
  });

  it('skips a phantom that is the same identity as the real subscriber', async () => {
    const { service, conversationRepository, subscriberRepository } = makeService();

    await service.adoptPhantomsInto({ ...baseParams, real, phantoms: [{ ...real }] });

    expect(conversationRepository.repointSubscriberParticipant.called).to.equal(false);
    expect(subscriberRepository.delete.called).to.equal(false);
  });

  it('never throws and does not delete the phantom when a repoint fails', async () => {
    const { service, subscriberRepository, logger } = makeService({
      repointMcp: sinon.stub().rejects(new Error('mongo down')),
    });

    await service.adoptPhantomsInto({ ...baseParams, real, phantoms: [phantom] });

    expect(subscriberRepository.delete.called).to.equal(false);
    expect(logger.warn.called).to.equal(true);
  });

  it('adopts each phantom when several share the email', async () => {
    const { service, subscriberRepository } = makeService();
    const secondPhantom = { _id: 'mongo-phantom-2', subscriberId: 'sub-phantom-2' };

    await service.adoptPhantomsInto({ ...baseParams, real, phantoms: [phantom, secondPhantom] });

    expect(subscriberRepository.delete.calledTwice).to.equal(true);
  });
});
