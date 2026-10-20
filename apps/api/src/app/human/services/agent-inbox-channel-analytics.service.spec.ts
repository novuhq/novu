import { AGENT_INBOX_EVENTS, ChatProviderIdEnum, EmailProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { AgentInboxChannelAnalytics } from './agent-inbox-channel-analytics.service';

describe('AgentInboxChannelAnalytics', () => {
  const scope = { environmentId: 'env1', organizationId: 'org1' };
  const telegram = { _id: 'int1', identifier: 'tg', providerId: ChatProviderIdEnum.Telegram };

  function setup({ runtime = 'human_relay', chats = 1 } = {}) {
    const agentIntegrationRepository = { findOne: sinon.stub().resolves({ _agentId: 'agent1' }) };
    const agentRepository = { findOne: sinon.stub().resolves({ _id: 'agent1', runtime }) };
    const channelEndpointRepository = {
      find: sinon.stub().resolves(Array.from({ length: chats }, (_, n) => ({ _id: `chat${n}` }))),
    };
    const environmentRepository = { findOne: sinon.stub().resolves({ apiKeys: [{ _userId: 'user1' }] }) };
    const analyticsService = { track: sinon.stub() };
    const service = new AgentInboxChannelAnalytics(
      agentIntegrationRepository as never,
      agentRepository as never,
      channelEndpointRepository as never,
      environmentRepository as never,
      analyticsService as never
    );

    return { service, agentIntegrationRepository, channelEndpointRepository, analyticsService };
  }

  it("counts the first chat linked on the Agent Inbox's Telegram for the account's owner", async () => {
    const { service, channelEndpointRepository, analyticsService } = setup();

    await service.countLinkedChat(scope, telegram);

    expect(channelEndpointRepository.find.firstCall.args).to.deep.equal([
      { _environmentId: 'env1', _organizationId: 'org1', integrationIdentifier: 'tg' },
      '_id',
      { limit: 2 },
    ]);
    expect(analyticsService.track.args).to.deep.equal([
      [
        AGENT_INBOX_EVENTS.CHANNEL_CONNECTED,
        'user1',
        { _organization: 'org1', agentId: 'agent1', channel: 'telegram' },
      ],
    ]);
  });

  it('counts nothing once the channel had a chat linked already', async () => {
    const { service, analyticsService } = setup({ chats: 2 });

    await service.countLinkedChat(scope, telegram);

    expect(analyticsService.track.called).to.equal(false);
  });

  it('counts nothing for a channel of any other agent', async () => {
    const { service, analyticsService } = setup({ runtime: 'managed' });

    await service.countLinkedChat(scope, telegram);

    expect(analyticsService.track.called).to.equal(false);
  });

  it('leaves email and other providers alone without looking anything up', async () => {
    const { service, agentIntegrationRepository, analyticsService } = setup();

    await service.countLinkedChat(scope, {
      _id: 'int2',
      identifier: 'inbox',
      providerId: EmailProviderIdEnum.AgentEmailInbox,
    });
    await service.countLinkedChat(scope, { _id: 'int3', identifier: 'teams', providerId: ChatProviderIdEnum.MsTeams });

    expect(agentIntegrationRepository.findOne.called).to.equal(false);
    expect(analyticsService.track.called).to.equal(false);
  });
});
