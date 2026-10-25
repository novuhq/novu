import { expect } from 'chai';
import sinon from 'sinon';
import type { ResolvedAgentConfig } from '../../channels/agent-config-resolver.service';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { InboundAckService } from './inbound-ack.service';

describe('InboundAckService working signal', () => {
  const agentId = 'agent1';
  const platformThreadId = 'slack:C123:1.1';

  function makeService() {
    const outboundGateway = {
      startTypingInConversation: sinon.stub().resolves(),
      reactToMessage: sinon.stub().resolves(),
    };
    const logger = {
      setContext: sinon.stub(),
      warn: sinon.stub(),
    };
    const service = new InboundAckService(outboundGateway as never, logger as never);

    return { service, outboundGateway };
  }

  function config(overrides: Partial<ResolvedAgentConfig> = {}): ResolvedAgentConfig {
    return {
      platform: AgentPlatformEnum.SLACK,
      integrationIdentifier: 'slack-main',
      acknowledgeOnReceived: true,
      isHumanRelay: false,
      ...overrides,
    } as ResolvedAgentConfig;
  }

  it('does not type on an Agent Inbox channel', async () => {
    const { service, outboundGateway } = makeService();

    await service.showWorkingSignal({
      agentId,
      config: config({ isHumanRelay: true }),
      platformThreadId,
      platformMessageId: 'msg-1',
      isFirstMessage: true,
    });

    expect(outboundGateway.startTypingInConversation.called).to.equal(false);
    expect(outboundGateway.reactToMessage.called).to.equal(false);
  });

  it('still types when a bridge agent receives a message', async () => {
    const { service, outboundGateway } = makeService();

    await service.showWorkingSignal({
      agentId,
      config: config(),
      platformThreadId,
      platformMessageId: 'msg-1',
      isFirstMessage: true,
    });

    expect(outboundGateway.startTypingInConversation.calledOnce).to.equal(true);
    expect(outboundGateway.startTypingInConversation.firstCall.args).to.deep.equal([
      agentId,
      'slack-main',
      platformThreadId,
    ]);
  });
});
