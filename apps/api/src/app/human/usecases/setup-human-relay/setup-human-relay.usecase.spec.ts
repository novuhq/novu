import { HumanChannelViaEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { SetupHumanRelayCommand } from './setup-human-relay.command';
import { SetupHumanRelay } from './setup-human-relay.usecase';

describe('SetupHumanRelay', () => {
  function setup(
    existingAgent: Record<string, unknown> | null = {
      _id: 'relay1',
      identifier: 'human-relay',
      runtime: 'human_relay',
      name: 'Human',
    }
  ) {
    const agentRepository = {
      findOne: sinon.stub().resolves(existingAgent),
      update: sinon.stub().resolves(),
      create: sinon.stub().callsFake(async (data: Record<string, unknown>) => ({ _id: 'relay-new', ...data })),
    };
    const subscriberRepository = { findOne: sinon.stub().resolves({ subscriberId: 'alice' }), update: sinon.stub() };
    const humanContactRepository = { setDefaultVia: sinon.stub().resolves() };
    const usecase = new SetupHumanRelay(
      agentRepository as never,
      subscriberRepository as never,
      humanContactRepository as never
    );

    return { usecase, agentRepository, humanContactRepository };
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

  describe('operator', () => {
    it("records the operator's subscriber without renaming the agent", async () => {
      const { usecase, agentRepository } = setup(null);

      await usecase.execute(
        SetupHumanRelayCommand.create({ ...base, operator: true, firstName: 'Nikita', lastName: 'Grossman' })
      );

      const created = agentRepository.create.firstCall.args[0];
      expect(created.name).to.equal('Human');
      expect(created.operatorSubscriberId).to.equal('alice');
    });

    it('points an existing relay at the operator and leaves its name alone', async () => {
      const { usecase, agentRepository } = setup();

      await usecase.execute(SetupHumanRelayCommand.create({ ...base, operator: true, firstName: 'Nikita' }));

      expect(agentRepository.update.calledOnce).to.equal(true);
      expect(agentRepository.update.firstCall.args[1]).to.deep.equal({ $set: { operatorSubscriberId: 'alice' } });
    });

    it('does not rewrite the pointer when it already matches', async () => {
      const { usecase, agentRepository } = setup({
        _id: 'relay1',
        identifier: 'human-relay',
        runtime: 'human_relay',
        name: 'Deploy bot',
        operatorSubscriberId: 'alice',
      });

      await usecase.execute(SetupHumanRelayCommand.create({ ...base, operator: true, firstName: 'Nikita' }));

      expect(agentRepository.update.called).to.equal(false);
    });

    it('never records an invitee as the operator', async () => {
      const { usecase, agentRepository } = setup();

      await usecase.execute(SetupHumanRelayCommand.create({ ...base, firstName: 'Alice', lastName: 'Chen' }));

      expect(agentRepository.update.called).to.equal(false);
    });
  });
});
