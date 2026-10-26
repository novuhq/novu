import { AGENT_INBOX_EVENTS, ChatProviderIdEnum, EmailProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { AgentInboxChannelAnalytics } from './agent-inbox-channel-analytics.service';

describe('AgentInboxChannelAnalytics', () => {
  const scope = { environmentId: 'env1', organizationId: 'org1' };
  const telegram = { _id: 'int1', identifier: 'tg', providerId: ChatProviderIdEnum.Telegram };

  function setup({ relay = { _id: 'agent1' } as { _id: string } | null, firstChat = 'chat1' } = {}) {
    const agentIntegrationRepository = {
      find: sinon.stub().resolves([{ _agentId: 'other1' }, { _agentId: 'agent1' }]),
    };
    const agentRepository = { findOne: sinon.stub().resolves(relay) };
    const channelEndpointRepository = { find: sinon.stub().resolves([{ _id: firstChat }]) };
    const environmentRepository = { findOne: sinon.stub().resolves({ apiKeys: [{ _userId: 'user1' }] }) };
    const analyticsService = { track: sinon.stub() };
    const service = new AgentInboxChannelAnalytics(
      agentIntegrationRepository as never,
      agentRepository as never,
      channelEndpointRepository as never,
      environmentRepository as never,
      analyticsService as never
    );

    return { service, agentIntegrationRepository, agentRepository, channelEndpointRepository, analyticsService };
  }

  it("counts the first chat linked on the Agent Inbox's Telegram for the account's owner", async () => {
    const { service, channelEndpointRepository, analyticsService } = setup();

    await service.countLinkedChat(scope, telegram, 'chat1');

    expect(channelEndpointRepository.find.firstCall.args).to.deep.equal([
      { _environmentId: 'env1', _organizationId: 'org1', integrationIdentifier: 'tg' },
      '_id',
      { sort: { _id: 1 }, limit: 1 },
    ]);
    expect(analyticsService.track.args).to.deep.equal([
      [
        AGENT_INBOX_EVENTS.CHANNEL_CONNECTED,
        'user1',
        { _organization: 'org1', agentId: 'agent1', channel: 'telegram' },
      ],
    ]);
  });

  it('counts nothing for a chat that is not the oldest on the channel', async () => {
    const { service, analyticsService } = setup({ firstChat: 'chat0' });

    await service.countLinkedChat(scope, telegram, 'chat1');

    expect(analyticsService.track.called).to.equal(false);
  });

  it('finds the Agent Inbox agent among every agent the channel is linked to', async () => {
    const { service, agentRepository, analyticsService } = setup();

    await service.countLinkedChat(scope, telegram, 'chat1');

    expect(agentRepository.findOne.firstCall.args[0]).to.deep.equal({
      _environmentId: 'env1',
      _organizationId: 'org1',
      _id: { $in: ['other1', 'agent1'] },
      runtime: 'human_relay',
    });
    expect(analyticsService.track.calledOnce).to.equal(true);
  });

  it('counts nothing for a channel no Agent Inbox agent has', async () => {
    const { service, channelEndpointRepository, analyticsService } = setup({ relay: null });

    await service.countLinkedChat(scope, telegram, 'chat1');

    expect(channelEndpointRepository.find.called).to.equal(false);
    expect(analyticsService.track.called).to.equal(false);
  });

  it('leaves email and other providers alone without looking anything up', async () => {
    const { service, agentIntegrationRepository, analyticsService } = setup();

    await service.countLinkedChat(
      scope,
      { _id: 'int2', identifier: 'inbox', providerId: EmailProviderIdEnum.AgentEmailInbox },
      'chat1'
    );
    await service.countLinkedChat(
      scope,
      { _id: 'int3', identifier: 'teams', providerId: ChatProviderIdEnum.MsTeams },
      'chat1'
    );

    expect(agentIntegrationRepository.find.called).to.equal(false);
    expect(analyticsService.track.called).to.equal(false);
  });
});
