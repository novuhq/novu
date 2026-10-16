import { NotFoundException } from '@nestjs/common';
import { expect } from 'chai';
import sinon from 'sinon';
import { HumanOperatorService } from './human-operator.service';

describe('HumanOperatorService.require', () => {
  const scope = { environmentId: 'env1', organizationId: 'org1', agentIdentifier: 'human-relay' };

  function setup({
    agent = { _id: 'relay1', runtime: 'human_relay' },
    operator = { subscriberId: 'dima' },
  }: {
    agent?: { _id: string; runtime: string } | null;
    operator?: { subscriberId: string } | null;
  } = {}) {
    const agentRepository = { findOne: sinon.stub().resolves(agent) };
    const subscriberRepository = { find: sinon.stub().resolves([]) };
    const humanContactRepository = {
      findOperator: sinon.stub().resolves(operator),
      findOperatorInEnvironment: sinon.stub().resolves(null),
    };
    const service = new HumanOperatorService(
      agentRepository as never,
      subscriberRepository as never,
      humanContactRepository as never
    );

    return { service, agentRepository, humanContactRepository };
  }

  async function notFoundCode(promise: Promise<unknown>): Promise<unknown> {
    const err = await promise.catch((error) => error);
    expect(err).to.be.instanceOf(NotFoundException);

    return ((err as NotFoundException).getResponse() as { code?: string }).code;
  }

  it('returns the relay agent and its operator', async () => {
    const { service, agentRepository, humanContactRepository } = setup();

    expect(await service.require(scope)).to.deep.equal({ agentId: 'relay1', subscriberId: 'dima' });
    expect(agentRepository.findOne.firstCall.args[0]).to.deep.equal({
      identifier: 'human-relay',
      _environmentId: 'env1',
      _organizationId: 'org1',
    });
    expect(humanContactRepository.findOperator.firstCall.args).to.deep.equal(['env1', 'relay1']);
  });

  it('is a 404 before setup made the agent', async () => {
    const { service } = setup({ agent: null });

    expect(await notFoundCode(service.require(scope))).to.equal('agent_not_found');
  });

  it('is a 404 for an agent that is not a relay', async () => {
    const { service } = setup({ agent: { _id: 'agent1', runtime: 'novu' } });

    expect(await notFoundCode(service.require(scope))).to.equal('agent_not_found');
  });

  it('is a 404 while nobody is set up as the operator', async () => {
    const { service } = setup({ operator: null });

    expect(await notFoundCode(service.require(scope))).to.equal('operator_not_found');
  });
});
