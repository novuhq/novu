import { expect } from 'chai';
import sinon from 'sinon';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { InboundAckService } from './inbound-ack.service';

describe('InboundAckService', () => {
  const agentId = 'agent1';
  const integrationIdentifier = 'slack-main';
  const platformThreadId = 'slack:C123:1783695626.846689';

  function makeService() {
    const outboundGateway = {
      startTypingInConversation: sinon.stub().resolves(),
      stopTypingInConversation: sinon.stub().resolves(),
      reactToMessage: sinon.stub().resolves(),
      removeReaction: sinon.stub().resolves(),
    };
    const logger = {
      setContext: sinon.stub(),
      warn: sinon.stub(),
    };
    const service = new InboundAckService(outboundGateway as any, logger as any);

    return { service, outboundGateway };
  }

  it('clears Slack typing when a managed turn completes', async () => {
    const { service, outboundGateway } = makeService();

    await service.onManagedTurnComplete({
      agentId,
      integrationIdentifier,
      platform: AgentPlatformEnum.SLACK,
      platformThreadId,
      platformMessageId: '1783695626.846689',
    });

    expect(outboundGateway.stopTypingInConversation.calledOnceWithExactly(agentId, integrationIdentifier, platformThreadId)).to.equal(
      true
    );
  });

  it('does not stop typing on non-typing platforms', async () => {
    const { service, outboundGateway } = makeService();

    await service.onManagedTurnComplete({
      agentId,
      integrationIdentifier,
      platform: AgentPlatformEnum.EMAIL,
      platformThreadId,
      firstPlatformMessageId: 'msg-1',
    });

    expect(outboundGateway.stopTypingInConversation.called).to.equal(false);
    expect(outboundGateway.removeReaction.calledOnce).to.equal(true);
  });
});
