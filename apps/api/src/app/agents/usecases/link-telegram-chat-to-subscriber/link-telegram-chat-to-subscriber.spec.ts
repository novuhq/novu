import { NotFoundException } from '@nestjs/common';
import { ChatProviderIdEnum, ENDPOINT_TYPES } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { LinkTelegramChatToSubscriberCommand } from './link-telegram-chat-to-subscriber.command';
import { LinkTelegramChatToSubscriber } from './link-telegram-chat-to-subscriber.usecase';

describe('LinkTelegramChatToSubscriber', () => {
  function makeUsecase(
    overrides: {
      integrationFindOne?: sinon.SinonStub;
      agentFindOne?: sinon.SinonStub;
      agentIntegrationFindOne?: sinon.SinonStub;
      subscriberFindBySubscriberId?: sinon.SinonStub;
      findByPlatformIdentity?: sinon.SinonStub;
      delete?: sinon.SinonStub;
      createChannelEndpointExecute?: sinon.SinonStub;
    } = {}
  ) {
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
      delete: overrides.delete ?? sinon.stub().resolves({ acknowledged: true, deletedCount: 1 }),
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
      createChannelEndpoint,
      channelEndpointRepository,
      subscriberRepository,
      agentIntegrationRepository,
      integrationRepository,
    };
  }

  const baseCommand = {
    environmentId: 'env-1',
    organizationId: 'org-1',
    agentIdentifier: 'support-agent',
    integrationId: 'integration-1',
    subscriberId: 'subscriber-1',
    chatId: '99999',
  };

  it('creates a telegram_chat channel endpoint when context is valid', async () => {
    const { usecase, createChannelEndpoint } = makeUsecase();

    const result = await usecase.execute(LinkTelegramChatToSubscriberCommand.create(baseCommand));

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

    const result = await usecase.execute(LinkTelegramChatToSubscriberCommand.create(baseCommand));

    expect(result.created).to.equal(false);
    expect(result.subscriberId).to.equal('subscriber-1');
    expect(createChannelEndpoint.execute.called).to.equal(false);
  });

  it('rebinds when the chatId maps to a different subscriber', async () => {
    const deleteStub = sinon.stub().resolves({ acknowledged: true, deletedCount: 1 });
    const { usecase, createChannelEndpoint, channelEndpointRepository } = makeUsecase({
      findByPlatformIdentity: sinon.stub().resolves({
        _id: 'old-endpoint',
        subscriberId: 'other-subscriber',
      }),
      delete: deleteStub,
    });

    const result = await usecase.execute(LinkTelegramChatToSubscriberCommand.create(baseCommand));

    expect(result.created).to.equal(true);
    expect(deleteStub.calledOnce).to.equal(true);
    expect(createChannelEndpoint.execute.calledOnce).to.equal(true);
    expect(channelEndpointRepository.delete.firstCall.args[0]).to.deep.include({
      _id: 'old-endpoint',
      _environmentId: 'env-1',
      _organizationId: 'org-1',
    });
  });

  it('throws NotFoundException when integration is not Telegram', async () => {
    const { usecase } = makeUsecase({
      integrationFindOne: sinon
        .stub()
        .resolves({ _id: 'integration-1', identifier: 'slack-main', providerId: ChatProviderIdEnum.Slack }),
    });

    try {
      await usecase.execute(LinkTelegramChatToSubscriberCommand.create(baseCommand));
      expect.fail('expected NotFoundException');
    } catch (err) {
      expect(err).to.be.instanceOf(NotFoundException);
    }
  });
});
