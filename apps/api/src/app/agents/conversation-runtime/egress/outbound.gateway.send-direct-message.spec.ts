import { expect } from 'chai';
import sinon from 'sinon';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { OutboundGateway } from './outbound.gateway';

describe('OutboundGateway sendDirectMessage', () => {
  const agentId = 'agent1';
  const integrationIdentifier = 'email-main';
  const recipientAddress = 'user@example.com';
  const threadId = 'email:user@example.com:abc123';

  function makeGateway(
    options: {
      platform?: AgentPlatformEnum;
      openDM?: sinon.SinonStub;
      adapterOpenDM?: sinon.SinonStub;
      chatOpenDM?: sinon.SinonStub;
    } = {}
  ) {
    const platform = options.platform ?? AgentPlatformEnum.EMAIL;
    const threadPost = sinon.stub().resolves({ id: 'msg-1', threadId });
    const thread = { post: threadPost };
    const adapterOpenDM = options.adapterOpenDM ?? sinon.stub().resolves(threadId);
    const chatOpenDM = options.chatOpenDM ?? sinon.stub().rejects(new Error('chat.openDM should not be called'));
    const openDM = options.openDM ?? chatOpenDM;

    const agentConfigResolver = {
      resolve: sinon.stub().resolves({ platform, removeNovuBranding: true, agentIdentifier: 'my-agent' }),
    };
    const registry = {
      getOrCreate: sinon.stub().resolves({
        openDM,
        thread: sinon.stub().returns(thread),
        getAdapter: sinon.stub().returns({ openDM: adapterOpenDM }),
      }),
    };
    const fileMaterializer = {
      prepareContentForDelivery: sinon.stub().callsFake(async (content: unknown) => content),
    };
    const actionTokenService = {
      applyActionTokens: sinon.stub().callsFake(async (content: unknown) => content),
    };
    const logger = {
      setContext: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
    };

    const gateway = new OutboundGateway(
      registry as any,
      {} as any,
      agentConfigResolver as any,
      fileMaterializer as any,
      actionTokenService as any,
      logger as any
    );

    return { gateway, adapterOpenDM, chatOpenDM: openDM, threadPost };
  }

  it('opens email DMs via the platform adapter instead of chat.openDM', async () => {
    const { gateway, adapterOpenDM, chatOpenDM, threadPost } = makeGateway();

    const result = await gateway.sendDirectMessage(agentId, integrationIdentifier, recipientAddress, {
      markdown: 'Connected! Reply to this email to try it out.',
    });

    expect(adapterOpenDM.calledOnceWith(recipientAddress)).to.equal(true);
    expect(chatOpenDM.called).to.equal(false);
    expect(threadPost.calledOnce).to.equal(true);
    expect(result).to.deep.equal({ messageId: 'msg-1', platformThreadId: threadId });
  });

  it('falls back to chat.openDM when the platform adapter does not implement openDM', async () => {
    const slackThread = { post: sinon.stub().resolves({ id: 'msg-2', threadId: 'slack:D123:msg-2' }) };
    const chatOpenDM = sinon.stub().resolves(slackThread);
    const { gateway } = makeGateway({
      platform: AgentPlatformEnum.SLACK,
      openDM: chatOpenDM,
      adapterOpenDM: undefined as unknown as sinon.SinonStub,
    });

    const registry = {
      getOrCreate: sinon.stub().resolves({
        openDM: chatOpenDM,
        thread: sinon.stub(),
        getAdapter: sinon.stub().returns({}),
      }),
    };
    const agentConfigResolver = {
      resolve: sinon.stub().resolves({
        platform: AgentPlatformEnum.SLACK,
        removeNovuBranding: true,
        agentIdentifier: 'my-agent',
      }),
    };
    const fileMaterializer = {
      prepareContentForDelivery: sinon.stub().callsFake(async (content: unknown) => content),
    };
    const actionTokenService = {
      applyActionTokens: sinon.stub().callsFake(async (content: unknown) => content),
    };
    const logger = {
      setContext: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
    };
    const slackGateway = new OutboundGateway(
      registry as any,
      {} as any,
      agentConfigResolver as any,
      fileMaterializer as any,
      actionTokenService as any,
      logger as any
    );

    const result = await slackGateway.sendDirectMessage(agentId, 'slack-main', 'U123456', {
      markdown: 'Your Slack app is connected! Send me a message to try it out.',
    });

    expect(chatOpenDM.calledOnceWith('U123456')).to.equal(true);
    expect(result).to.deep.equal({ messageId: 'msg-2', platformThreadId: 'slack:D123:msg-2' });
  });
});
