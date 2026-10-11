import { HumanChannelViaEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { InactiveHumanInviteError } from '../../services/human-invite-token.service';
import { GetHumanInviteStatusCommand } from './get-human-invite-status.command';
import { GetHumanInviteStatus } from './get-human-invite-status.usecase';

describe('GetHumanInviteStatus', () => {
  const invite = {
    payload: { env: 'env1', org: 'org1', agentId: 'relay1', subscriberId: 'alice' },
    expiresAt: '2026-10-02T10:00:00.000Z',
  };

  function setup({
    subscriber = { firstName: 'Alice', lastName: 'Chen' } as object | null,
    operator = { firstName: 'Dima', lastName: 'Grossman' } as object | null,
    operatorId = 'dima' as string | null,
  } = {}) {
    const inviteTokens = { peek: sinon.stub().resolves(invite) };
    const deliveryService = {
      describeInviteChannels: sinon.stub().resolves([
        { via: HumanChannelViaEnum.TELEGRAM, integrationIdentifier: 'tg', connected: true, isDefault: true },
        { via: HumanChannelViaEnum.SLACK, integrationIdentifier: 'slack', connected: false, isDefault: false },
      ]),
    };
    const agentRepository = { findOne: sinon.stub().resolves({ name: 'Deploy bot' }) };
    const subscriberRepository = { findOne: sinon.stub() };
    subscriberRepository.findOne.withArgs(sinon.match({ subscriberId: 'alice' })).resolves(subscriber);
    subscriberRepository.findOne.withArgs(sinon.match({ subscriberId: 'dima' })).resolves(operator);
    const operatorService = { findForAgent: sinon.stub().resolves(operatorId) };
    const usecase = new GetHumanInviteStatus(
      inviteTokens as never,
      deliveryService as never,
      agentRepository as never,
      subscriberRepository as never,
      operatorService as never
    );

    return { usecase, inviteTokens, agentRepository };
  }

  const command = GetHumanInviteStatusCommand.create({ token: 'T'.repeat(32) });

  it('describes the agent, the invitee and each app', async () => {
    const { usecase } = setup();

    expect(await usecase.execute(command)).to.deep.equal({
      valid: true,
      agentName: 'Deploy bot',
      inviterName: 'Dima Grossman',
      inviteeName: 'Alice Chen',
      expiresAt: '2026-10-02T10:00:00.000Z',
      channels: [
        { via: HumanChannelViaEnum.TELEGRAM, connected: true, isDefault: true },
        { via: HumanChannelViaEnum.SLACK, connected: false, isDefault: false },
      ],
    });
  });

  it('falls back to the subscriberId when the invitee has no name', async () => {
    const { usecase } = setup({ subscriber: null });

    const status = await usecase.execute(command);

    expect(status).to.include({ inviteeName: 'alice' });
  });

  it('leaves the inviter out when the account owner has no contact or no name', async () => {
    expect(await setup({ operatorId: null }).usecase.execute(command)).to.not.have.property('inviterName');
    expect(await setup({ operator: {} }).usecase.execute(command)).to.not.have.property('inviterName');
  });

  it('reports inactive links instead of throwing', async () => {
    const { usecase, inviteTokens } = setup();
    inviteTokens.peek.rejects(new InactiveHumanInviteError('declined'));

    expect(await usecase.execute(command)).to.deep.equal({ valid: false, reason: 'declined' });
  });

  it('reports the link as invalid when the relay agent is gone', async () => {
    const { usecase, agentRepository } = setup();
    agentRepository.findOne.resolves(null);

    expect(await usecase.execute(command)).to.deep.equal({ valid: false, reason: 'invalid' });
  });
});
