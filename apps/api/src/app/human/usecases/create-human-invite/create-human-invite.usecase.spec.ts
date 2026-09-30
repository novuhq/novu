import { NotFoundException } from '@nestjs/common';
import { HumanChannelViaEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { CreateHumanInviteCommand } from './create-human-invite.command';
import { CreateHumanInvite } from './create-human-invite.usecase';

describe('CreateHumanInvite', () => {
  const originalDashboardUrl = process.env.DASHBOARD_URL;

  afterEach(() => {
    process.env.DASHBOARD_URL = originalDashboardUrl;
  });

  function setup(channels: Array<{ via: HumanChannelViaEnum; integrationIdentifier: string; connected: boolean }>) {
    const setupHumanRelay = {
      execute: sinon.stub().resolves({ agentId: 'relay1', agentIdentifier: 'human-relay', subscriberId: 'alice' }),
    };
    const deliveryService = {
      describeInviteChannels: sinon.stub().resolves(channels.map((channel) => ({ ...channel, isDefault: false }))),
    };
    const inviteTokens = {
      issue: sinon.stub().resolves({ token: 'T'.repeat(32), expiresAt: '2026-10-02T10:00:00.000Z' }),
    };
    const usecase = new CreateHumanInvite(setupHumanRelay as never, deliveryService as never, inviteTokens as never);

    return { usecase, setupHumanRelay, inviteTokens };
  }

  const command = CreateHumanInviteCommand.create({
    environmentId: 'env1',
    organizationId: 'org1',
    userId: 'user1',
    subscriberId: 'alice',
    firstName: 'Alice',
    lastName: 'Chen',
  });

  it('returns a dashboard invite link and the apps offered on it', async () => {
    process.env.DASHBOARD_URL = 'https://eu.dashboard.novu.co/';
    const { usecase, setupHumanRelay, inviteTokens } = setup([
      { via: HumanChannelViaEnum.TELEGRAM, integrationIdentifier: 'tg', connected: false },
      { via: HumanChannelViaEnum.SLACK, integrationIdentifier: 'slack', connected: true },
    ]);

    const result = await usecase.execute(command);

    expect(result).to.deep.equal({
      url: `https://eu.dashboard.novu.co/agents/invite/${'T'.repeat(32)}`,
      expiresAt: '2026-10-02T10:00:00.000Z',
      channels: [
        { via: HumanChannelViaEnum.TELEGRAM, integrationIdentifier: 'tg', connected: false },
        { via: HumanChannelViaEnum.SLACK, integrationIdentifier: 'slack', connected: true },
      ],
    });
    expect(setupHumanRelay.execute.firstCall.args[0]).to.include({ subscriberId: 'alice', firstName: 'Alice' });
    expect(inviteTokens.issue.firstCall.args[0]).to.deep.equal({
      env: 'env1',
      org: 'org1',
      agentId: 'relay1',
      subscriberId: 'alice',
    });
  });

  it('refuses when the relay has no Telegram or Slack set up', async () => {
    const { usecase, inviteTokens } = setup([]);

    const err = await usecase.execute(command).catch((error) => error);

    expect(err).to.be.instanceOf(NotFoundException);
    expect((err as NotFoundException).message).to.include('human setup telegram');
    expect(inviteTokens.issue.called).to.equal(false);
  });
});
