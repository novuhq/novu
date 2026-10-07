import { ConflictException } from '@nestjs/common';
import { expect } from 'chai';
import sinon from 'sinon';
import { HumanAccountAgentService } from './human-account-agent.service';

describe('HumanAccountAgentService', () => {
  const account = { environmentId: 'env1', organizationId: 'org1', userId: 'user1' };
  const name = { firstName: 'Dima' };

  function setup({
    agent = { _id: 'relay1', runtime: 'human_relay' } as object | null,
    channels = 0,
    interactions = 0,
    otherContacts = 0,
  } = {}) {
    const agentRepository = { findOne: sinon.stub().resolves(agent), delete: sinon.stub().resolves() };
    const agentIntegrationRepository = { count: sinon.stub().resolves(channels) };
    const humanInteractionRepository = { count: sinon.stub().resolves(interactions) };
    const humanContactRepository = { delete: sinon.stub().resolves() };
    const subscriberRepository = { count: sinon.stub().resolves(otherContacts), delete: sinon.stub().resolves() };
    const humanOperator = { findForAgent: sinon.stub().resolves('human_aaaaaaaaaaaa') };
    const setupHumanRelay = { execute: sinon.stub().resolves() };
    const service = new HumanAccountAgentService(
      agentRepository as never,
      agentIntegrationRepository as never,
      humanInteractionRepository as never,
      humanContactRepository as never,
      subscriberRepository as never,
      humanOperator as never,
      setupHumanRelay as never
    );

    return { service, agentRepository, humanContactRepository, subscriberRepository, setupHumanRelay };
  }

  it('sets the agent up for the operator', async () => {
    const { service, setupHumanRelay } = setup();

    await service.setUp(account, name);

    expect(setupHumanRelay.execute.firstCall.args[0]).to.include({
      environmentId: 'env1',
      organizationId: 'org1',
      userId: 'user1',
      operator: true,
      firstName: 'Dima',
    });
  });

  it('removes an untouched agent and its operator before the claim runs', async () => {
    const { service, agentRepository, humanContactRepository, subscriberRepository, setupHumanRelay } = setup();
    const claim = sinon.stub().resolves('claimed');

    const result = await service.claimOverUntouchedAgent(account, name, claim);

    expect(result).to.equal('claimed');
    expect(agentRepository.delete.calledBefore(claim)).to.equal(true);
    expect(agentRepository.delete.firstCall.args[0]).to.include({ _id: 'relay1', _environmentId: 'env1' });
    expect(humanContactRepository.delete.firstCall.args[0]).to.include({ _agentId: 'relay1' });
    expect(subscriberRepository.delete.firstCall.args[0]).to.include({ subscriberId: 'human_aaaaaaaaaaaa' });
    expect(setupHumanRelay.execute.called).to.equal(false);
  });

  for (const [what, used] of [
    ['a channel', { channels: 1 }],
    ['an interaction', { interactions: 1 }],
    ['another contact', { otherContacts: 1 }],
  ] as const) {
    it(`leaves an agent with ${what} alone`, async () => {
      const { service, agentRepository } = setup(used);
      const claim = sinon.stub().rejects(new ConflictException({ code: 'claim_agent_exists' }));

      const error = await service.claimOverUntouchedAgent(account, name, claim).catch((err) => err);

      expect(error).to.be.instanceOf(ConflictException);
      expect(agentRepository.delete.called).to.equal(false);
    });
  }

  it('has nothing to remove for an account without an agent', async () => {
    const { service, agentRepository } = setup({ agent: null });

    await service.claimOverUntouchedAgent(account, name, sinon.stub().resolves());

    expect(agentRepository.delete.called).to.equal(false);
  });

  it('gives the account its agent back when the claim fails', async () => {
    const { service, setupHumanRelay } = setup();
    const failure = new Error('token expired');

    const error = await service
      .claimOverUntouchedAgent(account, name, sinon.stub().rejects(failure))
      .catch((err) => err);

    expect(error).to.equal(failure);
    expect(setupHumanRelay.execute.calledOnce).to.equal(true);
    expect(setupHumanRelay.execute.firstCall.args[0]).to.include({ operator: true, firstName: 'Dima' });
  });
});
