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
    const usecase = new SetupHumanRelay(
      agentRepository as never,
      subscriberRepository as never,
      humanContactRepository as never
    );

    return { usecase, humanContactRepository };
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
});
