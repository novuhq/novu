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

describe('HumanOperatorService.describe', () => {
  const scope = { environmentId: 'env1', organizationId: 'org1', agentIdentifier: 'human-relay' };

  function setup(agent: Record<string, unknown> | null, operator: { subscriberId: string } | null = null) {
    const agentRepository = { findOne: sinon.stub().resolves(agent) };
    const humanContactRepository = {
      findOperator: sinon.stub().resolves(operator),
      findOperatorInEnvironment: sinon.stub().resolves(null),
    };
    const service = new HumanOperatorService(
      agentRepository as never,
      { find: sinon.stub().resolves([]) } as never,
      humanContactRepository as never
    );

    return { service, agentRepository };
  }

  it('names the operator and the agent’s look from one read of the agent', async () => {
    const look = { shape: 'drop', color: 'coral', art: { kind: 'arcs', seed: 7 } };
    const { service, agentRepository } = setup(
      { _id: 'relay1', runtime: 'human_relay', look },
      { subscriberId: 'dima' }
    );

    expect(await service.describe(scope)).to.deep.equal({ subscriberId: 'dima', agentLook: look });
    expect(agentRepository.findOne.callCount).to.equal(1);
    expect(agentRepository.findOne.firstCall.args[1]).to.include('look');
  });

  it('gives an agent nobody picked a look for the original one, also while it has no operator', async () => {
    const { service } = setup({ _id: 'relay1', runtime: 'human_relay' });

    expect(await service.describe(scope)).to.deep.equal({
      agentLook: { shape: 'orb', color: 'ember', art: { kind: 'rays', seed: 0 } },
    });
  });

  it('says nothing before setup made the agent, or for an agent that is not a relay', async () => {
    expect(await setup(null).service.describe(scope)).to.deep.equal({});
    expect(await setup({ _id: 'a1', runtime: 'self-hosted' }).service.describe(scope)).to.deep.equal({});
  });
});

describe('HumanOperatorService.cardNameFor', () => {
  const scope = { environmentId: 'env1', organizationId: 'org1', agentId: 'relay1' };

  function setup(operator: { subscriberId: string } | null, names: { firstName?: string; lastName?: string } = {}) {
    const subscriberRepository = { find: sinon.stub().resolves([]), findOne: sinon.stub().resolves(names) };
    const humanContactRepository = {
      findOperator: sinon.stub().resolves(operator),
      findOperatorInEnvironment: sinon.stub().resolves(null),
    };
    const service = new HumanOperatorService(
      {} as never,
      subscriberRepository as never,
      humanContactRepository as never
    );

    return { service, subscriberRepository };
  }

  it('names the operator by their first name and the initial of their last name', async () => {
    const { service, subscriberRepository } = setup(
      { subscriberId: 'ada' },
      { firstName: 'Ada', lastName: 'Lovelace' }
    );

    expect(await service.cardNameFor(scope)).to.deep.equal({ operatorName: 'Ada L.', operatorFirstName: 'Ada' });
    expect(subscriberRepository.findOne.firstCall.args[0]).to.deep.equal({
      _environmentId: 'env1',
      subscriberId: 'ada',
    });
  });

  it('keeps a first name of several words whole', async () => {
    const { service } = setup({ subscriberId: 'mj' }, { firstName: ' Mary Jane ', lastName: 'Watson' });

    expect(await service.cardNameFor(scope)).to.deep.equal({
      operatorName: 'Mary Jane W.',
      operatorFirstName: 'Mary Jane',
    });
  });

  it('names nobody while nobody is set up as the operator', async () => {
    const { service, subscriberRepository } = setup(null);

    expect(await service.cardNameFor(scope)).to.equal(undefined);
    expect(subscriberRepository.findOne.called).to.equal(false);
  });
});
