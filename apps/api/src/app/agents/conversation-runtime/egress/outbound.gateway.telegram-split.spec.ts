import { HttpException, HttpStatus } from '@nestjs/common';
import { expect } from 'chai';
import sinon from 'sinon';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { OutboundGateway } from './outbound.gateway';
import { OutboundDeliveryInfo } from './outbound-delivery-info.service';

describe('OutboundGateway Telegram split posts', () => {
  const agentId = 'agent-1';
  const integrationIdentifier = 'telegram-main';
  const platformThreadId = 'telegram:42';

  function rateLimitError() {
    return Object.assign(new Error('Rate limited by telegram, retry after 5s'), {
      name: 'AdapterRateLimitError',
    });
  }

  function makeGateway(options: { platform?: AgentPlatformEnum; threadPost: sinon.SinonStub }) {
    const platform = options.platform ?? AgentPlatformEnum.TELEGRAM;
    const agentConfigResolver = {
      resolve: sinon.stub().resolves({
        platform,
        removeNovuBranding: true,
        agentIdentifier: 'my-agent',
        environmentId: 'env-1',
        organizationId: 'org-1',
        integrationIdentifier,
        integrationId: 'integration-1',
      }),
    };
    const registry = {
      getOrCreate: sinon.stub().resolves({
        thread: () => ({ post: options.threadPost }),
        getAdapter: () => ({}),
      }),
    };
    const conversation = {
      persistAgentMessage: sinon.stub().resolves({ activity: { _id: 'activity-row' }, created: true }),
      deleteAgentMessage: sinon.stub().resolves(),
      setAgentMessagePlatformMessageId: sinon.stub().resolves(),
    };
    const fileMaterializer = {
      prepareContentForDelivery: sinon.stub().callsFake(async (content: unknown) => content),
    };
    const logger = {
      setContext: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub(),
    };
    const gateway = new OutboundGateway(
      registry as never,
      conversation as never,
      agentConfigResolver as never,
      fileMaterializer as never,
      {} as never,
      new OutboundDeliveryInfo(),
      logger as never
    );

    return { gateway, conversation };
  }

  async function expectDeliveryFailure(run: () => Promise<unknown>, status: number) {
    try {
      await run();
      expect.fail('expected the post to fail');
    } catch (err) {
      expect(err).to.be.instanceOf(HttpException);
      expect((err as HttpException).getStatus()).to.equal(status);
      expect((err as HttpException).getResponse()).to.deep.include({ error: 'delivery_failed' });
    }
  }

  it('fails a rate-limited Telegram post once and does not leave a retryable status', async () => {
    const threadPost = sinon.stub().rejects(rateLimitError());
    const { gateway, conversation } = makeGateway({ threadPost });

    await expectDeliveryFailure(
      () =>
        gateway.deliver(
          {
            agentId,
            integrationIdentifier,
            platform: AgentPlatformEnum.TELEGRAM,
            platformThreadId,
          },
          { markdown: 'a long reply' },
          {
            conversationId: 'conv-1',
            channel: { platform: AgentPlatformEnum.TELEGRAM, platformThreadId } as never,
            agentIdentifier: 'my-agent',
            activityIdentifier: 'activity-1',
            environmentId: 'env-1',
            organizationId: 'org-1',
          }
        ),
      HttpStatus.CONFLICT
    );

    expect(threadPost.calledOnce).to.equal(true);
    expect(conversation.deleteAgentMessage.calledOnce).to.equal(true);
    expect(conversation.setAgentMessagePlatformMessageId.called).to.equal(false);
  });

  it('keeps a rate-limited post on another platform on the retryable delivery-failure path', async () => {
    const threadPost = sinon.stub().rejects(rateLimitError());
    const { gateway } = makeGateway({ platform: AgentPlatformEnum.TEAMS, threadPost });

    await expectDeliveryFailure(
      () =>
        gateway.postToConversation(agentId, integrationIdentifier, AgentPlatformEnum.TEAMS, 'teams:thread-1', {
          markdown: 'hello',
        }),
      HttpStatus.BAD_GATEWAY
    );

    expect(threadPost.calledOnce).to.equal(true);
  });
});
