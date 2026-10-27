import { expect } from 'chai';
import sinon from 'sinon';
import { NovuEmailCleanupService } from './cleanup-novu-email.service';

describe('NovuEmailCleanupService', () => {
  function setup() {
    const agentIntegrationRepository = { find: sinon.stub().resolves([]) };
    const integrationRepository = {
      findOne: sinon.stub().resolves(null),
      find: sinon.stub().resolves([]),
      delete: sinon.stub().resolves(),
    };
    const domainRouteRepository = { removeByDestination: sinon.stub().resolves() };
    const logger = { setContext: sinon.stub(), info: sinon.stub() };
    const service = new NovuEmailCleanupService(
      agentIntegrationRepository as never,
      integrationRepository as never,
      domainRouteRepository as never,
      logger as never
    );

    return { service, agentIntegrationRepository, integrationRepository, domainRouteRepository };
  }

  it('keeps custom routes when another inbox is still linked', async () => {
    const { service, agentIntegrationRepository, integrationRepository, domainRouteRepository } = setup();
    integrationRepository.findOne.resolves({ _id: 'human-inbox' });
    agentIntegrationRepository.find.resolves([{ _integrationId: 'novu-inbox' }]);
    integrationRepository.find.resolves([{ _id: 'novu-inbox' }]);

    await service.cleanupForIntegration('agent-1', 'human-inbox', 'env-1', 'org-1', null);

    expect(domainRouteRepository.removeByDestination.called).to.equal(false);
    expect(integrationRepository.delete.calledOnce).to.equal(true);
  });

  it('deletes custom routes when the unlinked inbox was the last one', async () => {
    const { service, integrationRepository, domainRouteRepository } = setup();
    integrationRepository.findOne.resolves({ _id: 'human-inbox' });

    await service.cleanupForIntegration('agent-1', 'human-inbox', 'env-1', 'org-1', null);

    expect(domainRouteRepository.removeByDestination.calledOnce).to.equal(true);
    expect(integrationRepository.delete.calledOnce).to.equal(true);
  });

  it('does not count the inbox being removed as one that can still serve routes', async () => {
    const { service, agentIntegrationRepository, integrationRepository, domainRouteRepository } = setup();
    integrationRepository.findOne.resolves({ _id: 'human-inbox' });
    agentIntegrationRepository.find.resolves([{ _integrationId: 'human-inbox' }]);
    integrationRepository.find.resolves([{ _id: 'human-inbox' }]);

    await service.cleanupForIntegration('agent-1', 'human-inbox', 'env-1', 'org-1', null);

    expect(domainRouteRepository.removeByDestination.calledOnce).to.equal(true);
  });
});
