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
    const subscriberRepository = { findOne: sinon.stub().resolves({ subscriberId: 'alice' }), update: sinon.stub() };
    const humanContactRepository = { setDefaultVia: sinon.stub().resolves() };
    const humanOperator = { resolve: sinon.stub().resolves('dima') };
    const usecase = new SetupHumanRelay(
      agentRepository as never,
      subscriberRepository as never,
      humanContactRepository as never,
      humanOperator as never
    );

    return { usecase, humanContactRepository, humanOperator, subscriberRepository };
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

  it('never asks who the operator is for anyone else', async () => {
    const { usecase, humanOperator } = setup();

    const result = await usecase.execute(SetupHumanRelayCommand.create(base));

    expect(humanOperator.resolve.called).to.equal(false);
    expect(result.subscriberId).to.equal('alice');
  });
});
