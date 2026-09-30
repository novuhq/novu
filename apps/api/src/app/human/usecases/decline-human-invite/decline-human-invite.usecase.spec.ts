import { ConflictException } from '@nestjs/common';
import { HumanChannelViaEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { InactiveHumanInviteError } from '../../services/human-invite-token.service';
import { DeclineHumanInviteCommand } from './decline-human-invite.command';
import { DeclineHumanInvite } from './decline-human-invite.usecase';

describe('DeclineHumanInvite', () => {
  function setup(connected: boolean) {
    const inviteTokens = {
      peek: sinon.stub().resolves({
        payload: { env: 'env1', org: 'org1', agentId: 'relay1', subscriberId: 'alice' },
        expiresAt: '2026-10-02T10:00:00.000Z',
      }),
      decline: sinon.stub().resolves({ payload: {}, expiresAt: 0 }),
      undoDecline: sinon.stub().resolves(),
    };
    const deliveryService = {
      describeInviteChannels: sinon
        .stub()
        .resolves([
          { via: HumanChannelViaEnum.TELEGRAM, integrationIdentifier: 'tg', connected, isDefault: connected },
        ]),
    };
    const usecase = new DeclineHumanInvite(inviteTokens as never, deliveryService as never);

    return { usecase, inviteTokens, deliveryService };
  }

  const command = DeclineHumanInviteCommand.create({ token: 'T'.repeat(32) });

  it('retires the link while nothing is connected', async () => {
    const { usecase, inviteTokens } = setup(false);

    expect(await usecase.execute(command)).to.deep.equal({ declined: true });
    expect(inviteTokens.decline.calledOnceWith('T'.repeat(32))).to.equal(true);
  });

  it('refuses once the invitee has connected an app', async () => {
    const { usecase, inviteTokens } = setup(true);

    const err = await usecase.execute(command).catch((error) => error);

    expect(err).to.be.instanceOf(ConflictException);
    expect((err as ConflictException).getResponse()).to.include({ code: 'channel_already_connected' });
    expect(inviteTokens.decline.called).to.equal(false);
  });

  it('puts the link back when the person finished connecting while declining', async () => {
    const { usecase, inviteTokens, deliveryService } = setup(false);
    deliveryService.describeInviteChannels
      .onSecondCall()
      .resolves([{ via: HumanChannelViaEnum.TELEGRAM, integrationIdentifier: 'tg', connected: true, isDefault: true }]);

    const err = await usecase.execute(command).catch((error) => error);

    expect(err).to.be.instanceOf(ConflictException);
    expect(inviteTokens.undoDecline.calledOnceWith('T'.repeat(32), { payload: {}, expiresAt: 0 })).to.equal(true);
  });

  it('puts the link back when the check after retiring it fails', async () => {
    const { usecase, inviteTokens, deliveryService } = setup(false);
    const outage = new Error('database unavailable');
    deliveryService.describeInviteChannels.onSecondCall().rejects(outage);

    const err = await usecase.execute(command).catch((error) => error);

    expect(err).to.equal(outage);
    expect(inviteTokens.undoDecline.calledOnceWith('T'.repeat(32), { payload: {}, expiresAt: 0 })).to.equal(true);
  });

  it('treats a second decline as done', async () => {
    const { usecase, inviteTokens } = setup(false);
    inviteTokens.peek.rejects(new InactiveHumanInviteError('declined'));

    expect(await usecase.execute(command)).to.deep.equal({ declined: true });
    expect(inviteTokens.decline.called).to.equal(false);
  });
});
