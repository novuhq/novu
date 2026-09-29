import { BadRequestException } from '@nestjs/common';
import { HumanChannelViaEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { SetHumanInviteDefaultCommand } from './set-human-invite-default.command';
import { SetHumanInviteDefault } from './set-human-invite-default.usecase';

describe('SetHumanInviteDefault', () => {
  function setup(slackConnected: boolean) {
    const inviteTokens = {
      requireActive: sinon.stub().resolves({
        payload: { env: 'env1', org: 'org1', agentId: 'relay1', subscriberId: 'alice' },
        expiresAt: '2026-10-02T10:00:00.000Z',
      }),
    };
    const deliveryService = {
      describeInviteChannels: sinon.stub().resolves([
        { via: HumanChannelViaEnum.TELEGRAM, integrationIdentifier: 'tg', connected: true, isDefault: true },
        { via: HumanChannelViaEnum.SLACK, integrationIdentifier: 'slack', connected: slackConnected, isDefault: false },
      ]),
    };
    const humanContactRepository = { setDefaultVia: sinon.stub().resolves() };
    const usecase = new SetHumanInviteDefault(
      inviteTokens as never,
      deliveryService as never,
      humanContactRepository as never
    );

    return { usecase, humanContactRepository };
  }

  const command = SetHumanInviteDefaultCommand.create({ token: 'T'.repeat(32), via: HumanChannelViaEnum.SLACK });

  it("saves the invitee's pick as their own choice", async () => {
    const { usecase, humanContactRepository } = setup(true);

    expect(await usecase.execute(command)).to.deep.equal({ defaultVia: HumanChannelViaEnum.SLACK });
    expect(humanContactRepository.setDefaultVia.firstCall.args[0]).to.deep.equal({
      environmentId: 'env1',
      organizationId: 'org1',
      agentId: 'relay1',
      subscriberId: 'alice',
      via: HumanChannelViaEnum.SLACK,
      setBy: 'contact',
    });
  });

  it('refuses an app the invitee has not connected yet', async () => {
    const { usecase, humanContactRepository } = setup(false);

    const err = await usecase.execute(command).catch((error) => error);

    expect(err).to.be.instanceOf(BadRequestException);
    expect((err as BadRequestException).getResponse()).to.include({ code: 'channel_not_connected' });
    expect(humanContactRepository.setDefaultVia.called).to.equal(false);
  });
});
