import { expect } from 'chai';
import sinon from 'sinon';
import { ChatProviderIdEnum, ENDPOINT_TYPES } from '@novu/shared';
import { InvalidTelegramSubscriberLinkTokenError } from '../../services/telegram-mobile-link-token.service';
import { LinkTelegramChatToSubscriberCommand } from './link-telegram-chat-to-subscriber.command';
import { LinkTelegramChatToSubscriber, LinkTelegramChatTokenError } from './link-telegram-chat-to-subscriber.usecase';

describe('LinkTelegramChatToSubscriber', () => {
  function makeUsecase(
    overrides: {
      verifySubscriberLink?: sinon.SinonStub;
      claimSubscriberLinkJti?: sinon.SinonStub;
      integrationFindOne?: sinon.SinonStub;
      agentFindOne?: sinon.SinonStub;
      agentIntegrationFindOne?: sinon.SinonStub;
      subscriberFindBySubscriberId?: sinon.SinonStub;
      findByPlatformIdentity?: sinon.SinonStub;
      createChannelEndpointExecute?: sinon.SinonStub;
    } = {}
  ) {
    const tokenService = {
      verifySubscriberLink:
        overrides.verifySubscriberLink ??
        sinon.stub().returns({
          env: 'env-1',
          org: 'org-1',
          aid: 'support-agent',
          iid: 'integration-1',
          sid: 'subscriber-1',
          jti: 'jti-1',
        }),
      claimSubscriberLinkJti: overrides.claimSubscriberLinkJti ?? sinon.stub().resolves(true),
      releaseSubscriberLinkJti: sinon.stub().resolves(undefined),
    };

    const agentRepository = {
      findOne: overrides.agentFindOne ?? sinon.stub().resolves({ _id: 'agent-mongo-1', identifier: 'support-agent' }),
    };
    const integrationRepository = {
      findOne:
        overrides.integrationFindOne ??
        sinon
          .stub()
          .resolves({ _id: 'integration-1', identifier: 'telegram-main', providerId: ChatProviderIdEnum.Telegram }),
    };
    const agentIntegrationRepository = {
      findOne: overrides.agentIntegrationFindOne ?? sinon.stub().resolves({ _id: 'link-1' }),
    };
    const subscriberRepository = {
      findBySubscriberId:
        overrides.subscriberFindBySubscriberId ?? sinon.stub().resolves({ subscriberId: 'subscriber-1' }),
    };
    const channelEndpointRepository = {
      findByPlatformIdentity: overrides.findByPlatformIdentity ?? sinon.stub().resolves(null),
    };
    const createChannelEndpoint = {
      execute: overrides.createChannelEndpointExecute ?? sinon.stub().resolves({ identifier: 'chendp_123' }),
    };
    const logger = {
      setContext: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub(),
      info: sinon.stub(),
    };

    const usecase = new LinkTelegramChatToSubscriber(
      tokenService as any,
      agentRepository as any,
      integrationRepository as any,
      agentIntegrationRepository as any,
      subscriberRepository as any,
      channelEndpointRepository as any,
      createChannelEndpoint as any,
      logger as any
    );

    return {
      usecase,
      tokenService,
      createChannelEndpoint,
      channelEndpointRepository,
      subscriberRepository,
      agentIntegrationRepository,
      integrationRepository,
    };
  }

  it('creates a telegram_chat channel endpoint when token + chatId are valid', async () => {
    const { usecase, createChannelEndpoint } = makeUsecase();

    const result = await usecase.execute(
      LinkTelegramChatToSubscriberCommand.create({
        token: 'valid-token',
        chatId: '99999',
      })
    );

    expect(result.created).to.equal(true);
    expect(result.subscriberId).to.equal('subscriber-1');
    expect(result.agentIdentifier).to.equal('support-agent');
    expect(createChannelEndpoint.execute.calledOnce).to.equal(true);

    const cmd = createChannelEndpoint.execute.firstCall.args[0];
    expect(cmd.type).to.equal(ENDPOINT_TYPES.TELEGRAM_CHAT);
    expect(cmd.endpoint).to.deep.equal({ chatId: '99999' });
    expect(cmd.subscriberId).to.equal('subscriber-1');
    expect(cmd.integrationIdentifier).to.equal('telegram-main');
  });

  it('is idempotent when the same chatId is already mapped to the same subscriber', async () => {
    const { usecase, createChannelEndpoint } = makeUsecase({
      findByPlatformIdentity: sinon.stub().resolves({ subscriberId: 'subscriber-1' }),
    });

    const result = await usecase.execute(
      LinkTelegramChatToSubscriberCommand.create({
        token: 'valid-token',
        chatId: '99999',
      })
    );

    expect(result.created).to.equal(false);
    expect(result.subscriberId).to.equal('subscriber-1');
    expect(createChannelEndpoint.execute.called).to.equal(false);
  });

  it('rejects with chat_already_linked when the chatId already maps to a different subscriber', async () => {
    const { usecase, createChannelEndpoint } = makeUsecase({
      findByPlatformIdentity: sinon.stub().resolves({ subscriberId: 'other-subscriber' }),
    });

    try {
      await usecase.execute(
        LinkTelegramChatToSubscriberCommand.create({ token: 'valid-token', chatId: '99999' })
      );
      expect.fail('Expected chat_already_linked error');
    } catch (err) {
      expect(err).to.be.instanceOf(LinkTelegramChatTokenError);
      expect((err as LinkTelegramChatTokenError).reason).to.equal('chat_already_linked');
    }

    expect(createChannelEndpoint.execute.called).to.equal(false);
  });

  it('rejects with used when the jti was already claimed', async () => {
    const { usecase, createChannelEndpoint } = makeUsecase({
      claimSubscriberLinkJti: sinon.stub().resolves(false),
    });

    try {
      await usecase.execute(
        LinkTelegramChatToSubscriberCommand.create({ token: 'valid-token', chatId: '99999' })
      );
      expect.fail('Expected used error');
    } catch (err) {
      expect(err).to.be.instanceOf(LinkTelegramChatTokenError);
      expect((err as LinkTelegramChatTokenError).reason).to.equal('used');
    }

    expect(createChannelEndpoint.execute.called).to.equal(false);
  });

  it('translates token verification failures to a LinkTelegramChatTokenError', async () => {
    const { usecase } = makeUsecase({
      verifySubscriberLink: sinon.stub().throws(new InvalidTelegramSubscriberLinkTokenError('expired')),
    });

    try {
      await usecase.execute(
        LinkTelegramChatToSubscriberCommand.create({ token: 'expired-token', chatId: '99999' })
      );
      expect.fail('Expected expired error');
    } catch (err) {
      expect(err).to.be.instanceOf(LinkTelegramChatTokenError);
      expect((err as LinkTelegramChatTokenError).reason).to.equal('expired');
    }
  });

  it('rejects with mismatch + releases the jti when the integration is not Telegram', async () => {
    const releaseStub = sinon.stub().resolves(undefined);
    const { usecase, createChannelEndpoint } = makeUsecase({
      integrationFindOne: sinon
        .stub()
        .resolves({ _id: 'integration-1', identifier: 'slack-main', providerId: ChatProviderIdEnum.Slack }),
    });
    // Override releaseSubscriberLinkJti so we can verify it was called.
    (usecase as any).tokenService.releaseSubscriberLinkJti = releaseStub;

    try {
      await usecase.execute(LinkTelegramChatToSubscriberCommand.create({ token: 'tok', chatId: '99' }));
      expect.fail('Expected mismatch error');
    } catch (err) {
      expect(err).to.be.instanceOf(LinkTelegramChatTokenError);
      expect((err as LinkTelegramChatTokenError).reason).to.equal('mismatch');
    }

    expect(createChannelEndpoint.execute.called).to.equal(false);
    expect(releaseStub.calledWith('jti-1')).to.equal(true);
  });
});
