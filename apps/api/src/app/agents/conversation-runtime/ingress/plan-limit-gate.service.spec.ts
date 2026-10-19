import { expect } from 'chai';
import type { Thread } from 'chat';
import sinon from 'sinon';

import { ResolvedAgentConfig } from '../../channels/agent-config-resolver.service';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { PlanLimitGateService } from './plan-limit-gate.service';

function makeConfig(overrides: Partial<ResolvedAgentConfig> = {}): ResolvedAgentConfig {
  return {
    platform: AgentPlatformEnum.SLACK,
    isKeyless: false,
    isHumanRelay: false,
    environmentId: 'env-1',
    organizationId: 'org-1',
    agentId: 'agent-1',
    agentIdentifier: 'support',
    providerId: 'slack',
    ...overrides,
  } as ResolvedAgentConfig;
}

describe('PlanLimitGateService human relay', () => {
  const thread = { isDM: true } as Thread;

  function setup() {
    const agentEntitlements = {
      checkRuntimeLimits: sinon.stub().resolves({ agentWithinLimit: false, channelWithinLimit: false }),
    };
    const outboundGateway = { replyOnThreadWithCard: sinon.stub().resolves() };
    const conversationActivation = {
      shouldBlockFreeTier: sinon.stub().resolves({ blocked: true }),
    };
    const conversationService = { findByPublicIdentifier: sinon.stub().resolves(null) };
    const logger = { setContext: sinon.stub(), warn: sinon.stub() };
    const gate = new PlanLimitGateService(
      logger as never,
      agentEntitlements as never,
      outboundGateway as never,
      conversationActivation as never,
      conversationService as never
    );

    return { gate, agentEntitlements, outboundGateway, conversationActivation, conversationService };
  }

  it('does not block a human relay or post an upgrade card when the agent and channel are over the plan', async () => {
    const { gate, agentEntitlements, outboundGateway } = setup();

    const blocked = await gate.maybeBlock('agent-1', makeConfig({ isHumanRelay: true }), thread);

    expect(blocked).to.equal(false);
    expect(agentEntitlements.checkRuntimeLimits.called).to.equal(false);
    expect(outboundGateway.replyOnThreadWithCard.called).to.equal(false);
  });

  it('does not block a human relay conversation when the free-tier conversation limit is reached', async () => {
    const { gate, conversationActivation, outboundGateway } = setup();

    const blocked = await gate.maybeBlockConversation('agent-1', makeConfig({ isHumanRelay: true }), thread);

    expect(blocked).to.equal(false);
    expect(conversationActivation.shouldBlockFreeTier.called).to.equal(false);
    expect(outboundGateway.replyOnThreadWithCard.called).to.equal(false);
  });

  it('does not block web chat accept for a human relay', async () => {
    const { gate, agentEntitlements, conversationService } = setup();

    const block = await gate.checkWebChatAcceptLimits('agent-1', makeConfig({ isHumanRelay: true }), {
      isNewThread: true,
    });

    expect(block).to.equal(null);
    expect(agentEntitlements.checkRuntimeLimits.called).to.equal(false);
    expect(conversationService.findByPublicIdentifier.called).to.equal(false);
  });

  it('still posts the upgrade card for a customer agent that is over the plan', async () => {
    const { gate, outboundGateway } = setup();

    const blocked = await gate.maybeBlock('agent-1', makeConfig(), thread);

    expect(blocked).to.equal(true);
    expect(outboundGateway.replyOnThreadWithCard.calledOnce).to.equal(true);
  });
});
