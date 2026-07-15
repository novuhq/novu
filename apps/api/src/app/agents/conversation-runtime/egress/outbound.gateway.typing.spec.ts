import { expect } from 'chai';
import sinon from 'sinon';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { OutboundGateway } from './outbound.gateway';

describe('OutboundGateway typing', () => {
  const agentId = 'agent1';
  const integrationIdentifier = 'slack-main';
  const platformThreadId = 'slack:C123:1783695626.846689';

  function makeGateway(
    options: { platform?: AgentPlatformEnum; setAssistantStatus?: sinon.SinonStub; startTyping?: sinon.SinonStub } = {}
  ) {
    const platform = options.platform ?? AgentPlatformEnum.SLACK;
    const setAssistantStatus = options.setAssistantStatus ?? sinon.stub().resolves();
    const startTyping = options.startTyping ?? sinon.stub().resolves();

    const agentConfigResolver = {
      resolve: sinon.stub().resolves({ platform }),
    };
    const registry = {
      getOrCreate: sinon.stub().resolves({
        thread: () => ({ startTyping }),
        getAdapter: () => ({ setAssistantStatus }),
      }),
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
      {} as any,
      {} as any,
      logger as any
    );

    return { gateway, setAssistantStatus, startTyping, logger };
  }

  it('clears Slack assistant status on stop without calling startTyping', async () => {
    const { gateway, setAssistantStatus, startTyping } = makeGateway();

    await gateway.stopTypingInConversation(agentId, integrationIdentifier, platformThreadId);

    expect(setAssistantStatus.calledOnceWith('C123', '1783695626.846689', '')).to.equal(true);
    expect(startTyping.called).to.equal(false);
  });

  it('no-ops stop on non-Slack typing platforms', async () => {
    const { gateway, setAssistantStatus, startTyping } = makeGateway({ platform: AgentPlatformEnum.TEAMS });

    await gateway.stopTypingInConversation(agentId, integrationIdentifier, platformThreadId);

    expect(setAssistantStatus.called).to.equal(false);
    expect(startTyping.called).to.equal(false);
  });

  it('routes empty startTyping status to Slack stop', async () => {
    const { gateway, setAssistantStatus, startTyping } = makeGateway();

    await gateway.startTypingInConversation(agentId, integrationIdentifier, platformThreadId, '   ');

    expect(setAssistantStatus.calledOnceWith('C123', '1783695626.846689', '')).to.equal(true);
    expect(startTyping.called).to.equal(false);
  });

  it('warns and does not throw when Slack status clear fails', async () => {
    const setAssistantStatus = sinon.stub().rejects(new Error('invalid_arguments'));
    const { gateway, logger } = makeGateway({ setAssistantStatus });

    await gateway.stopTypingInConversation(agentId, integrationIdentifier, platformThreadId);

    expect(logger.warn.calledOnce).to.equal(true);
  });

  it('warns and does not throw when startTyping fails', async () => {
    const startTyping = sinon.stub().rejects(new Error('platform down'));
    const { gateway, logger } = makeGateway({ startTyping, platform: AgentPlatformEnum.TELEGRAM });

    await gateway.startTypingInConversation(agentId, integrationIdentifier, platformThreadId, 'Thinking...');

    expect(logger.warn.calledOnce).to.equal(true);
  });
});
