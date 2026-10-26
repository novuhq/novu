import { NotFoundException } from '@nestjs/common';
import { AGENT_INBOX_EVENTS, HumanChannelViaEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { CreateHumanInviteCommand } from './create-human-invite.command';
import { CreateHumanInvite } from './create-human-invite.usecase';

describe('CreateHumanInvite', () => {
  const originalEnv = { HUMAN_DASHBOARD_URL: process.env.HUMAN_DASHBOARD_URL, NOVU_REGION: process.env.NOVU_REGION };

  afterEach(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
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
    const analyticsService = { track: sinon.stub() };
    const usecase = new CreateHumanInvite(
      setupHumanRelay as never,
      deliveryService as never,
      inviteTokens as never,
      analyticsService as never
    );

    return { usecase, setupHumanRelay, inviteTokens, analyticsService };
  }

  const command = CreateHumanInviteCommand.create({
    environmentId: 'env1',
    organizationId: 'org1',
    userId: 'user1',
    subscriberId: 'alice',
    firstName: 'Alice',
    lastName: 'Chen',
  });

  it('returns an invite link on the Human dashboard and the apps offered on it', async () => {
    process.env.HUMAN_DASHBOARD_URL = 'https://gethuman.md/';
    delete process.env.NOVU_REGION;
    const { usecase, setupHumanRelay, inviteTokens } = setup([
      { via: HumanChannelViaEnum.TELEGRAM, integrationIdentifier: 'tg', connected: false },
      { via: HumanChannelViaEnum.SLACK, integrationIdentifier: 'slack', connected: true },
    ]);

    const result = await usecase.execute(command);

    expect(result).to.deep.equal({
      url: `https://gethuman.md/invite/${'T'.repeat(32)}`,
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

  it('tags links from an EU deployment so the page calls the EU API', async () => {
    process.env.HUMAN_DASHBOARD_URL = 'https://gethuman.md';
    process.env.NOVU_REGION = 'eu-central-1';
    const { usecase } = setup([{ via: HumanChannelViaEnum.TELEGRAM, integrationIdentifier: 'tg', connected: false }]);

    const { url } = await usecase.execute(command);

    expect(url).to.equal(`https://gethuman.md/invite/${'T'.repeat(32)}?region=eu`);
  });

  it('refuses when the relay has no invite channels set up', async () => {
    const { usecase, inviteTokens, analyticsService } = setup([]);

    const err = await usecase.execute(command).catch((error) => error);

    expect(err).to.be.instanceOf(NotFoundException);
    expect((err as NotFoundException).message).to.include('npx @agentinbox/cli setup');
    expect(inviteTokens.issue.called).to.equal(false);
    expect(analyticsService.track.called).to.equal(false);
  });

  it('counts the invite for the owner, with the app that asked', async () => {
    const { usecase, setupHumanRelay, analyticsService } = setup([
      { via: HumanChannelViaEnum.TELEGRAM, integrationIdentifier: 'tg', connected: false },
    ]);

    await usecase.execute(CreateHumanInviteCommand.create({ ...command, analyticsSource: 'dashboard' }));

    expect(setupHumanRelay.execute.firstCall.args[0]).to.include({ analyticsSource: 'dashboard' });
    expect(analyticsService.track.args).to.deep.equal([
      [AGENT_INBOX_EVENTS.CONTACT_INVITED, 'user1', { _organization: 'org1', agentId: 'relay1', source: 'dashboard' }],
    ]);
  });
});
