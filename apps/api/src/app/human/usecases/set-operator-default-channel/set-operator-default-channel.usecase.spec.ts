import { BadRequestException, NotFoundException } from '@nestjs/common';
import { HumanChannelViaEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { SetOperatorDefaultChannelCommand } from './set-operator-default-channel.command';
import { SetOperatorDefaultChannel } from './set-operator-default-channel.usecase';

describe('SetOperatorDefaultChannel', () => {
  function setup(connected: HumanChannelViaEnum[]) {
    const humanOperator = { require: sinon.stub().resolves({ agentId: 'relay1', subscriberId: 'dima' }) };
    const deliveryService = {
      describeReachability: sinon.stub().resolves({
        targets: connected.map((via) => ({
          via,
          platform: via,
          platformUserId: `${via}-id`,
          integrationIdentifier: via,
        })),
        defaultVia: connected[0],
      }),
    };
    const humanContactRepository = { setDefaultVia: sinon.stub().resolves() };
    const usecase = new SetOperatorDefaultChannel(
      humanOperator as never,
      deliveryService as never,
      humanContactRepository as never
    );

    return { usecase, humanOperator, deliveryService, humanContactRepository };
  }

  function command(via: HumanChannelViaEnum, agentIdentifier?: string) {
    return SetOperatorDefaultChannelCommand.create({
      environmentId: 'env1',
      organizationId: 'org1',
      userId: 'user1',
      via,
      ...(agentIdentifier ? { agentIdentifier } : {}),
    });
  }

  it("saves the operator's pick as their own choice", async () => {
    const { usecase, humanOperator, deliveryService, humanContactRepository } = setup([
      HumanChannelViaEnum.TELEGRAM,
      HumanChannelViaEnum.SLACK,
    ]);

    expect(await usecase.execute(command(HumanChannelViaEnum.SLACK))).to.deep.equal({
      defaultVia: HumanChannelViaEnum.SLACK,
    });
    expect(humanOperator.require.firstCall.args[0]).to.deep.equal({
      environmentId: 'env1',
      organizationId: 'org1',
      agentIdentifier: 'human-relay',
    });
    expect(deliveryService.describeReachability.firstCall.args[0]).to.deep.equal({
      environmentId: 'env1',
      organizationId: 'org1',
      agentId: 'relay1',
      subscriberId: 'dima',
    });
    expect(humanContactRepository.setDefaultVia.firstCall.args[0]).to.deep.equal({
      environmentId: 'env1',
      organizationId: 'org1',
      agentId: 'relay1',
      subscriberId: 'dima',
      via: HumanChannelViaEnum.SLACK,
      setBy: 'contact',
    });
  });

  it('asks about the relay agent the caller names', async () => {
    const { usecase, humanOperator } = setup([HumanChannelViaEnum.TELEGRAM]);

    await usecase.execute(command(HumanChannelViaEnum.TELEGRAM, 'second-relay'));

    expect(humanOperator.require.firstCall.args[0]).to.include({ agentIdentifier: 'second-relay' });
  });

  it('refuses a channel the operator is not connected on', async () => {
    const { usecase, humanContactRepository } = setup([HumanChannelViaEnum.TELEGRAM]);

    const err = await usecase.execute(command(HumanChannelViaEnum.EMAIL)).catch((error) => error);

    expect(err).to.be.instanceOf(BadRequestException);
    expect((err as BadRequestException).getResponse()).to.deep.include({
      code: 'channel_not_connected',
      message: 'Connect Email first.',
    });
    expect(humanContactRepository.setDefaultVia.called).to.equal(false);
  });

  it('passes on a missing agent or operator without saving anything', async () => {
    const { usecase, humanOperator, deliveryService, humanContactRepository } = setup([HumanChannelViaEnum.TELEGRAM]);
    humanOperator.require.rejects(new NotFoundException({ code: 'operator_not_found', message: 'nope' }));

    const err = await usecase.execute(command(HumanChannelViaEnum.TELEGRAM)).catch((error) => error);

    expect(err).to.be.instanceOf(NotFoundException);
    expect(deliveryService.describeReachability.called).to.equal(false);
    expect(humanContactRepository.setDefaultVia.called).to.equal(false);
  });
});
