import { HumanChannelViaEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { SetupHumanRelayCommand } from './setup-human-relay.command';
import { SetupHumanRelay } from './setup-human-relay.usecase';

describe('SetupHumanRelay', () => {
  function setup() {
    const agentRepository = {
      findOne: sinon.stub().resolves({ _id: 'relay1', identifier: 'human-relay', runtime: 'human_relay' }),
    };
    const subscriberRepository: Record<string, sinon.SinonStub> = {
      findOne: sinon.stub().resolves({ subscriberId: 'alice' }),
      update: sinon.stub(),
    };
    const humanContactRepository = { setDefaultVia: sinon.stub().resolves() };
    const humanOperator = { resolve: sinon.stub().resolves('dima') };
    const humanAgentIdentity = { apply: sinon.stub().callsFake(async (agent: unknown) => agent) };
    const usecase = new SetupHumanRelay(
      agentRepository as never,
      subscriberRepository as never,
      humanContactRepository as never,
      humanOperator as never,
      humanAgentIdentity as never
    );

    return {
      usecase,
      agentRepository,
      humanContactRepository,
      humanOperator,
      humanAgentIdentity,
      subscriberRepository,
    };
  }

  const base = { environmentId: 'env1', organizationId: 'org1', userId: 'user1', subscriberId: 'alice' };

  it("saves the inviter's --via as the human's default", async () => {
    const { usecase, humanContactRepository } = setup();

    await usecase.execute(SetupHumanRelayCommand.create({ ...base, defaultVia: HumanChannelViaEnum.TELEGRAM }));

    expect(humanContactRepository.setDefaultVia.firstCall.args[0]).to.deep.equal({
      environmentId: 'env1',
      organizationId: 'org1',
      agentId: 'relay1',
      subscriberId: 'alice',
      via: HumanChannelViaEnum.TELEGRAM,
      setBy: 'inviter',
    });
  });

  it('leaves the default alone when no channel is passed', async () => {
    const { usecase, humanContactRepository } = setup();

    await usecase.execute(SetupHumanRelayCommand.create(base));

    expect(humanContactRepository.setDefaultVia.called).to.equal(false);
  });

  it('sets up the recorded operator instead of the id the caller suggests', async () => {
    const { usecase, humanOperator, subscriberRepository } = setup();

    const result = await usecase.execute(SetupHumanRelayCommand.create({ ...base, operator: true }));

    expect(humanOperator.resolve.firstCall.args).to.deep.equal([
      { environmentId: 'env1', organizationId: 'org1', agentId: 'relay1' },
      'alice',
    ]);
    expect(result.subscriberId).to.equal('dima');
    expect(subscriberRepository.findOne.firstCall.args[0].subscriberId).to.equal('dima');
  });

  it('still saves the email when another setup creates the subscriber first', async () => {
    const { usecase, subscriberRepository } = setup();
    subscriberRepository.findOne.onFirstCall().resolves(null);
    subscriberRepository.create = sinon
      .stub()
      .rejects(Object.assign(new Error('E11000 duplicate key'), { code: 11000 }));

    await usecase.execute(SetupHumanRelayCommand.create({ ...base, email: 'Alice@Example.com' }));

    expect(subscriberRepository.update.firstCall.args[1]).to.deep.equal({ $set: { email: 'alice@example.com' } });
  });

  it('never asks who the operator is for anyone else', async () => {
    const { usecase, humanOperator } = setup();

    const result = await usecase.execute(SetupHumanRelayCommand.create(base));

    expect(humanOperator.resolve.called).to.equal(false);
    expect(result.subscriberId).to.equal('alice');
  });

  it('names a new relay agent as asked', async () => {
    const { usecase, agentRepository } = setup();
    agentRepository.findOne.resolves(null);
    const create = sinon.stub().resolves({ _id: 'relay1', identifier: 'human-relay', runtime: 'human_relay' });
    Object.assign(agentRepository, { create });

    await usecase.execute(
      SetupHumanRelayCommand.create({ ...base, agentName: ' Deploy bot ', agentDescription: 'Ships the app.' })
    );

    expect(create.firstCall.args[0]).to.include({ name: 'Deploy bot', description: 'Ships the app.' });
  });

  it('calls a new relay agent "Human" until it is named', async () => {
    const { usecase, agentRepository } = setup();
    agentRepository.findOne.resolves(null);
    const create = sinon.stub().resolves({ _id: 'relay1', identifier: 'human-relay', runtime: 'human_relay' });
    Object.assign(agentRepository, { create });

    await usecase.execute(SetupHumanRelayCommand.create(base));

    expect(create.firstCall.args[0].name).to.equal('Human');
    expect(create.firstCall.args[0]).to.not.have.property('description');
  });

  it('renames the relay agent it already has when setup runs again', async () => {
    const { usecase, humanAgentIdentity } = setup();

    await usecase.execute(SetupHumanRelayCommand.create({ ...base, agentName: 'Deploy bot' }));

    expect(humanAgentIdentity.apply.firstCall.args[1]).to.deep.equal({ name: 'Deploy bot', description: undefined });
  });
});
