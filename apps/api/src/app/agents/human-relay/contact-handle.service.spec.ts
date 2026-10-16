import { ENDPOINT_TYPES } from '@novu/shared';
import { WebClient } from '@slack/web-api';
import { expect } from 'chai';
import sinon from 'sinon';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';
import { ContactHandleService } from './contact-handle.service';

describe('ContactHandleService', () => {
  const telegramConfig = {
    environmentId: 'env-1',
    organizationId: 'org-1',
    platform: AgentPlatformEnum.TELEGRAM,
    integrationIdentifier: 'telegram-main',
    isHumanRelay: true,
  };
  const slackConfig = { ...telegramConfig, platform: AgentPlatformEnum.SLACK, integrationIdentifier: 'slack-main' };

  let apiCall: sinon.SinonStub;

  beforeEach(() => {
    apiCall = sinon.stub(WebClient.prototype, 'apiCall');
  });

  afterEach(() => {
    sinon.restore();
  });

  function setup({
    endpoint = { chatId: '42' } as Record<string, unknown>,
    found = true,
    token = 'xoxb-test' as string | undefined,
  } = {}) {
    const channelEndpointRepository = {
      findOne: sinon.stub().resolves(found ? { _id: 'endpoint-1', endpoint } : null),
      update: sinon.stub().resolves({ matched: 1, modified: 1 }),
    };
    const agentConfigResolver = { resolveSlackBotToken: sinon.stub().resolves(token) };
    const logger = { setContext: sinon.stub(), warn: sinon.stub() };
    const service = new ContactHandleService(
      channelEndpointRepository as never,
      agentConfigResolver as never,
      logger as never
    );

    return { service, channelEndpointRepository, agentConfigResolver, logger };
  }

  function telegramMessage(from: Record<string, unknown>) {
    return { author: { userId: '42', userName: 'x', fullName: 'x' }, raw: { chat: { id: 42 }, from } };
  }

  describe('on Telegram', () => {
    it("keeps the username and name from the person's message on their chat's endpoint", async () => {
      const { service, channelEndpointRepository } = setup();

      await service.refresh({
        config: telegramConfig as never,
        subscriberId: 'dima',
        platformUserId: '42',
        message: telegramMessage({ id: 42, username: 'dima', first_name: 'Dima', last_name: 'Grossman' }) as never,
      });

      expect(channelEndpointRepository.findOne.firstCall.args[0]).to.deep.equal({
        _environmentId: 'env-1',
        _organizationId: 'org-1',
        integrationIdentifier: 'telegram-main',
        subscriberId: 'dima',
        type: ENDPOINT_TYPES.TELEGRAM_CHAT,
        'endpoint.chatId': '42',
      });
      expect(channelEndpointRepository.update.firstCall.args).to.deep.equal([
        { _id: 'endpoint-1', _environmentId: 'env-1', _organizationId: 'org-1' },
        { $set: { 'endpoint.username': 'dima', 'endpoint.displayName': 'Dima Grossman' } },
      ]);
    });

    it('reads a button press too, and drops a username the person removed', async () => {
      const { service, channelEndpointRepository } = setup({
        endpoint: { chatId: '42', username: 'dima', displayName: 'Dima' },
      });

      await service.refresh({
        config: telegramConfig as never,
        subscriberId: 'dima',
        platformUserId: '42',
        actionRaw: { id: 'callback-1', from: { id: 42, first_name: 'Dima' } },
      });

      expect(channelEndpointRepository.update.firstCall.args[1]).to.deep.equal({
        $unset: { 'endpoint.username': '' },
      });
    });

    it('writes nothing when the handle is unchanged', async () => {
      const { service, channelEndpointRepository } = setup({
        endpoint: { chatId: '42', username: 'dima', displayName: 'Dima' },
      });

      await service.refresh({
        config: telegramConfig as never,
        subscriberId: 'dima',
        platformUserId: '42',
        message: telegramMessage({ id: 42, username: 'dima', first_name: 'Dima' }) as never,
      });

      expect(channelEndpointRepository.update.called).to.equal(false);
    });
  });

  describe('on Slack', () => {
    function slackMessage(userName: string, fullName = 'Dima Grossman') {
      return { author: { userId: 'U1', userName, fullName }, raw: { team_id: 'T1' } };
    }

    it("keeps the message author's display name and asks Slack for the workspace once", async () => {
      apiCall.withArgs('auth.test').resolves({ ok: true, url: 'https://acme.slack.com/' });
      const { service, channelEndpointRepository, agentConfigResolver } = setup({ endpoint: { userId: 'U1' } });

      await service.refresh({
        config: slackConfig as never,
        subscriberId: 'dima',
        platformUserId: 'U1',
        message: slackMessage('dima') as never,
      });

      expect(channelEndpointRepository.findOne.firstCall.args[0]).to.include({
        type: ENDPOINT_TYPES.SLACK_USER,
        'endpoint.userId': 'U1',
      });
      expect(agentConfigResolver.resolveSlackBotToken.firstCall.args).to.deep.equal([
        'env-1',
        'org-1',
        'slack-main',
        'T1',
      ]);
      expect(apiCall.calledOnceWith('auth.test')).to.equal(true);
      expect(channelEndpointRepository.update.firstCall.args[1]).to.deep.equal({
        $set: { 'endpoint.displayName': 'dima', 'endpoint.workspaceDomain': 'acme.slack.com' },
      });
    });

    it('asks Slack nothing when the message brings the name and the workspace is already known', async () => {
      const { service, channelEndpointRepository, agentConfigResolver } = setup({
        endpoint: { userId: 'U1', displayName: 'dima', workspaceDomain: 'acme.slack.com' },
      });

      await service.refresh({
        config: slackConfig as never,
        subscriberId: 'dima',
        platformUserId: 'U1',
        message: slackMessage('dima.g') as never,
      });

      expect(agentConfigResolver.resolveSlackBotToken.called).to.equal(false);
      expect(apiCall.called).to.equal(false);
      expect(channelEndpointRepository.update.firstCall.args[1]).to.deep.equal({
        $set: { 'endpoint.displayName': 'dima.g' },
      });
    });

    it("takes the workspace from a button press and asks Slack for a name it doesn't have yet", async () => {
      apiCall
        .withArgs('users.info')
        .resolves({ ok: true, user: { real_name: 'Dima Grossman', profile: { display_name: 'dima' } } });
      const { service, channelEndpointRepository } = setup({ endpoint: { userId: 'U1' } });

      await service.refresh({
        config: slackConfig as never,
        subscriberId: 'dima',
        platformUserId: 'U1',
        actionRaw: { type: 'block_actions', team: { id: 'T1', domain: 'acme' }, user: { id: 'U1', name: 'dima' } },
      });

      expect(apiCall.calledOnceWith('users.info', { user: 'U1' })).to.equal(true);
      expect(channelEndpointRepository.update.firstCall.args[1]).to.deep.equal({
        $set: { 'endpoint.displayName': 'dima', 'endpoint.workspaceDomain': 'acme.slack.com' },
      });
    });

    it("keeps what it has when Slack can't be asked", async () => {
      apiCall.rejects(new Error('ratelimited'));
      const { service, channelEndpointRepository } = setup({ endpoint: { userId: 'U1', displayName: 'dima' } });

      await service.refresh({
        config: slackConfig as never,
        subscriberId: 'dima',
        platformUserId: 'U1',
        // What the chat SDK hands over when Slack couldn't say who wrote.
        message: slackMessage('U1', 'U1') as never,
      });

      expect(channelEndpointRepository.update.called).to.equal(false);
    });
  });

  it('leaves agents other than Agent Inbox relays alone', async () => {
    const { service, channelEndpointRepository } = setup();

    await service.refresh({
      config: { ...telegramConfig, isHumanRelay: false } as never,
      subscriberId: 'dima',
      platformUserId: '42',
      message: telegramMessage({ id: 42, username: 'dima' }) as never,
    });

    expect(channelEndpointRepository.findOne.called).to.equal(false);
  });

  it('does nothing for someone not linked on that chat', async () => {
    const { service, channelEndpointRepository } = setup({ found: false });

    await service.refresh({
      config: telegramConfig as never,
      subscriberId: 'dima',
      platformUserId: '42',
      message: telegramMessage({ id: 42, username: 'dima' }) as never,
    });

    expect(channelEndpointRepository.update.called).to.equal(false);
  });

  it('never fails the message', async () => {
    const { service, channelEndpointRepository, logger } = setup();
    channelEndpointRepository.findOne.rejects(new Error('mongo down'));

    await service.refresh({
      config: telegramConfig as never,
      subscriberId: 'dima',
      platformUserId: '42',
      message: telegramMessage({ id: 42, username: 'dima' }) as never,
    });

    expect(logger.warn.calledOnce).to.equal(true);
  });
});
