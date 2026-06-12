import { expect } from 'chai';
import sinon from 'sinon';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { OutboundGateway } from './outbound.gateway';

describe('OutboundGateway plan fallback', () => {
  const planModel = {
    title: 'Thinking…',
    tasks: [{ id: 't1', title: 'search_files', status: 'in_progress' as const }],
  };
  const planPhase = 'thinking' as const;

  function makeGateway(adapter: Record<string, unknown>) {
    const registry = {
      getOrCreate: sinon.stub().resolves({
        getAdapter: () => adapter,
        thread: sinon.stub(),
      }),
    };
    const agentConfigResolver = {
      resolve: sinon.stub().resolves({ platform: AgentPlatformEnum.TELEGRAM }),
    };
    const logger = { setContext: sinon.stub(), warn: sinon.stub(), error: sinon.stub() };

    const gateway = new OutboundGateway(
      registry as any,
      {} as any,
      agentConfigResolver as any,
      { prepareContentForDelivery: sinon.stub().callsFake(async (c) => c) } as any,
      {} as any,
      logger as any
    );

    return { gateway, registry, agentConfigResolver };
  }

  it('postPlanObject uses markdown delivery when adapter has no postObject', async () => {
    const { gateway } = makeGateway({ editMessage: sinon.stub() });
    const postStub = sinon
      .stub(gateway, 'postToConversation')
      .resolves({ messageId: 'msg-1', platformThreadId: 'thread-1' });

    const result = await gateway.postPlanObject(
      'agent1',
      'telegram-main',
      'telegram',
      'thread-1',
      planModel,
      planPhase
    );

    expect(postStub.calledOnce).to.equal(true);
    expect(postStub.firstCall.args[4]).to.deep.equal({
      markdown: '🧠 **Thinking…**\n\n🔄 `search_files`',
    });
    expect(result).to.deep.equal({ messageId: 'msg-1', platformThreadId: 'thread-1' });

    postStub.restore();
  });

  it('editPlanObject uses markdown edit when adapter has no editObject', async () => {
    const { gateway } = makeGateway({ editMessage: sinon.stub() });
    const editStub = sinon.stub(gateway, 'editInConversation').resolves({
      messageId: 'msg-1',
      platformThreadId: 'thread-1',
    });

    await gateway.editPlanObject('agent1', 'telegram-main', 'telegram', 'thread-1', 'msg-1', planModel, planPhase);

    expect(editStub.calledOnce).to.equal(true);
    expect(editStub.firstCall.args[5]).to.deep.equal({
      markdown: '🧠 **Thinking…**\n\n🔄 `search_files`',
    });

    editStub.restore();
  });

  it('postPlanObject skips delivery on WhatsApp', async () => {
    const { gateway } = makeGateway({ editMessage: async () => ({ id: '1', threadId: 't' }) });
    const postStub = sinon.stub(gateway, 'postToConversation');

    const result = await gateway.postPlanObject(
      'agent1',
      'whatsapp-main',
      'whatsapp',
      'thread-1',
      planModel,
      planPhase
    );

    expect(result).to.equal(null);
    expect(postStub.called).to.equal(false);

    postStub.restore();
  });

  it('postPlanObject uses postObject when adapter supports it', async () => {
    const postObject = sinon.stub().resolves({ id: 'native-1', threadId: 'thread-1' });
    const { gateway } = makeGateway({ postObject, editObject: sinon.stub() });
    const postToConversation = sinon.stub(gateway, 'postToConversation');

    const result = await gateway.postPlanObject('agent1', 'slack-main', 'slack', 'thread-1', planModel, planPhase);

    expect(postObject.calledOnce).to.equal(true);
    expect(postToConversation.called).to.equal(false);
    expect(result).to.deep.equal({ messageId: 'native-1', platformThreadId: 'thread-1' });

    postToConversation.restore();
  });
});
